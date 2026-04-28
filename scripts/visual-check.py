from pathlib import Path
import os
import struct
import zlib

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "playwright"
URL = os.environ.get("DIGITAL_EARTH_URL", "http://127.0.0.1:5173/")


def paeth(left, up, up_left):
    estimate = left + up - up_left
    left_distance = abs(estimate - left)
    up_distance = abs(estimate - up)
    diagonal_distance = abs(estimate - up_left)

    if left_distance <= up_distance and left_distance <= diagonal_distance:
        return left
    if up_distance <= diagonal_distance:
        return up
    return up_left


def read_png(path):
    data = Path(path).read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"{path} is not a PNG")

    pos = 8
    width = height = color_type = bit_depth = None
    compressed = bytearray()

    while pos < len(data):
        length = struct.unpack(">I", data[pos : pos + 4])[0]
        chunk_type = data[pos + 4 : pos + 8]
        chunk = data[pos + 8 : pos + 8 + length]
        pos += 12 + length

        if chunk_type == b"IHDR":
            width, height, bit_depth, color_type, _, _, _ = struct.unpack(">IIBBBBB", chunk)
        elif chunk_type == b"IDAT":
            compressed.extend(chunk)
        elif chunk_type == b"IEND":
            break

    if bit_depth != 8 or color_type not in (2, 6):
        raise ValueError(f"Unsupported PNG format: bit_depth={bit_depth}, color_type={color_type}")

    channels = 4 if color_type == 6 else 3
    bytes_per_pixel = channels
    stride = width * bytes_per_pixel
    raw = zlib.decompress(bytes(compressed))
    rows = []
    previous = bytearray(stride)
    offset = 0

    for _ in range(height):
        filter_type = raw[offset]
        offset += 1
        scanline = bytearray(raw[offset : offset + stride])
        offset += stride

        for index in range(stride):
            left = scanline[index - bytes_per_pixel] if index >= bytes_per_pixel else 0
            up = previous[index]
            up_left = previous[index - bytes_per_pixel] if index >= bytes_per_pixel else 0

            if filter_type == 1:
                scanline[index] = (scanline[index] + left) & 255
            elif filter_type == 2:
                scanline[index] = (scanline[index] + up) & 255
            elif filter_type == 3:
                scanline[index] = (scanline[index] + ((left + up) // 2)) & 255
            elif filter_type == 4:
                scanline[index] = (scanline[index] + paeth(left, up, up_left)) & 255
            elif filter_type != 0:
                raise ValueError(f"Unsupported PNG filter: {filter_type}")

        rows.append(bytes(scanline))
        previous = scanline

    return width, height, channels, rows


def pixel_stats(path, region=None, step=8):
    width, height, channels, rows = read_png(path)

    if region is None:
        region = (0, 0, width, height)

    x0, y0, x1, y1 = region
    total = 0
    non_dark = 0
    unique = set()
    min_luma = 255
    max_luma = 0

    for y in range(max(0, y0), min(height, y1), step):
        row = rows[y]
        for x in range(max(0, x0), min(width, x1), step):
            index = x * channels
            red, green, blue = row[index], row[index + 1], row[index + 2]
            luma = int(0.2126 * red + 0.7152 * green + 0.0722 * blue)
            total += 1
            non_dark += luma > 30
            min_luma = min(min_luma, luma)
            max_luma = max(max_luma, luma)
            unique.add((red // 12, green // 12, blue // 12))

    return {
        "size": f"{width}x{height}",
        "samples": total,
        "non_dark_ratio": round(non_dark / max(total, 1), 3),
        "unique_buckets": len(unique),
        "luma_range": f"{min_luma}-{max_luma}",
    }


def capture_initial(page, label, viewport):
    page.set_viewport_size(viewport)
    page.goto(URL, wait_until="domcontentloaded")
    page.wait_for_selector("#earth canvas")
    page.wait_for_timeout(3500)

    screenshot = OUT / f"{label}-verified.png"
    page.screenshot(path=str(screenshot))

    metrics = page.evaluate(
        """
        () => {
          const canvas = document.querySelector('#earth canvas');
          const rect = canvas.getBoundingClientRect();
          const loading = document.querySelector('#loadingScreen');
          return {
            canvasWidth: Math.round(rect.width),
            canvasHeight: Math.round(rect.height),
            loadingHidden: loading.classList.contains('is-hidden'),
            altitude: document.querySelector('#altitudeOutput').value,
            mode: document.querySelector('#modeLabel').textContent
          };
        }
        """
    )

    region = (
        int(viewport["width"] * 0.18),
        int(viewport["height"] * 0.10),
        int(viewport["width"] * 0.82),
        int(viewport["height"] * 0.86),
    )
    return label, metrics, pixel_stats(screenshot, region=region)


def capture_city(page):
    page.set_viewport_size({"width": 1440, "height": 900})
    page.goto(URL, wait_until="domcontentloaded")
    page.wait_for_selector("#earth canvas")
    page.wait_for_timeout(2500)
    page.click('[data-place="new-york"]')
    page.wait_for_timeout(9000)

    screenshot = OUT / "new-york-street.png"
    page.screenshot(path=str(screenshot))

    metrics = page.evaluate(
        """
        () => ({
          altitude: document.querySelector('#altitudeOutput').value,
          center: document.querySelector('#centerOutput').value,
          detail: document.querySelector('#detailOutput').value,
          mode: document.querySelector('#modeLabel').textContent,
          canvasCount: document.querySelectorAll('#earth canvas').length
        })
        """
    )
    return "new-york", metrics, pixel_stats(screenshot, region=(360, 90, 1100, 780))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    results = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page()

        results.append(capture_initial(page, "desktop", {"width": 1440, "height": 900}))
        results.append(capture_initial(page, "mobile", {"width": 390, "height": 844}))
        results.append(capture_city(page))

        browser.close()

    for label, metrics, pixels in results:
        print(label)
        print(f"  metrics: {metrics}")
        print(f"  pixels: {pixels}")


if __name__ == "__main__":
    main()
