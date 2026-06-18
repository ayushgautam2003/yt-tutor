import re
import os
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound


def _build_api() -> YouTubeTranscriptApi:
    proxy_url = os.getenv("WEBSHARE_PROXY_URL")
    if proxy_url:
        try:
            from youtube_transcript_api.proxies import WebshareProxyConfig
            username, rest = proxy_url.split(":", 1)
            password, host_port = rest.rsplit("@", 1)
            return YouTubeTranscriptApi(
                proxy_config=WebshareProxyConfig(
                    proxy_username=username,
                    proxy_password=password,
                )
            )
        except Exception:
            pass

    generic_proxy = os.getenv("HTTPS_PROXY") or os.getenv("HTTP_PROXY")
    if generic_proxy:
        return YouTubeTranscriptApi(proxies={"http": generic_proxy, "https": generic_proxy})

    return YouTubeTranscriptApi()


_api = _build_api()


def extract_video_id(url: str) -> str:
    patterns = [
        r"(?:v=|\/)([0-9A-Za-z_-]{11})",
        r"youtu\.be\/([0-9A-Za-z_-]{11})",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    raise ValueError(f"Could not extract video ID from URL: {url}")


def get_transcript(url: str) -> dict:
    video_id = extract_video_id(url)
    try:
        try:
            fetched = _api.fetch(video_id, languages=["en"])
        except Exception:
            transcript_list = _api.list(video_id)
            first = next(iter(transcript_list))
            fetched = first.fetch()

        full_text = " ".join(snippet.text for snippet in fetched)
        return {"url": url, "video_id": video_id, "transcript": full_text}
    except TranscriptsDisabled:
        raise ValueError(f"Transcripts are disabled for video: {url}")
    except NoTranscriptFound:
        raise ValueError(f"No transcript found for video: {url}")


def extract_all_transcripts(urls: list) -> tuple:
    results = []
    errors = []
    for url in urls:
        if not url.strip():
            continue
        try:
            results.append(get_transcript(url.strip()))
        except Exception as e:
            errors.append({"url": url, "error": str(e)})
    return results, errors
