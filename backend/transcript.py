import re
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound

_api = YouTubeTranscriptApi()


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
        # v1.x API: instance method, try English first then any available language
        try:
            fetched = _api.fetch(video_id, languages=["en"])
        except Exception:
            # Fallback: list available transcripts and fetch the first one
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
