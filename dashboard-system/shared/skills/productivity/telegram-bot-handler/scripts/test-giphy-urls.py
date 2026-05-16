#!/usr/bin/env python3
"""Test Giphy URLs for Telegram compatibility"""
import requests
import sys

def test_giphy_urls(urls):
    """Test a list of Giphy URLs, return working ones"""
    working = []
    for url in urls:
        try:
            resp = requests.head(url, timeout=5, allow_redirects=True)
            status = "OK ✓" if resp.status_code == 200 else f"FAIL ({resp.status_code})"
            print(f"{url}: {status}")
            if resp.status_code == 200:
                working.append(url)
        except Exception as e:
            print(f"{url}: ERROR - {e}")
    return working

if __name__ == "__main__":
    # Common test URLs
    test_urls = [
        "https://media.giphy.com/media/3oKIPnmiqNhUIW7a28/giphy.mp4",
        "https://media.giphy.com/media/a7VjBxK0iZUsw/giphy.mp4",
        "https://media.giphy.com/media/l0MYEqEzwMWFCg8rm/giphy.mp4",
        "https://media.giphy.com/media/3o7TKsQ8MQv99Kq0Ew/giphy.mp4",
        "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.mp4",
    ]
    
    print("Testing Giphy URLs...\n")
    working = test_giphy_urls(test_urls)
    print(f"\nWorking URLs: {len(working)}/{len(test_urls)}")