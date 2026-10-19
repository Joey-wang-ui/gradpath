"""Keep institution facts and the requested ranking edition independently sourced."""

from collections import Counter
from datetime import date
import base64
import hashlib
import json
from pathlib import Path
from urllib.parse import urlparse


DATA = Path(__file__).resolve().parents[1] / "frontend" / "data"
PROGRAM_EXAMPLES = {
    "stanford": ("MS · Computer Science", "12.01", "准备材料", "https://www.cs.stanford.edu/admissions/masters"),
    "columbia": ("MS · Data Science", "01.15", "文书撰写", "https://datascience.columbia.edu/education/programs/m-s-in-data-science/"),
    "nyu": ("MS · Computer Science", "12.01", "准备材料", "https://cs.nyu.edu/home/master/prospective_ms.html"),
    "mit": ("Master · Business Analytics", "01.05", "了解项目", "https://mitsloan.mit.edu/master-of-business-analytics"),
    "umich": ("MS · Information", "01.15", "了解项目", "https://www.si.umich.edu/programs/master-science-information"),
    "bu": ("MS · Applied Data Analytics", "02.01", "了解项目", "https://www.bu.edu/met/degrees-certificates/ms-applied-data-analytics/"),
}


def validate_ranking(ranking: dict, school_ids: set[str], data_dir: Path = DATA) -> None:
    if ranking.get("year") != 2027:
        raise ValueError("Only the explicitly requested 2027 edition is accepted")
    if ranking.get("publisher") != "U.S. News & World Report" or ranking.get("category") != "National Universities":
        raise ValueError("The ranking must be U.S. News National Universities")
    entries = ranking.get("entries")
    if not isinstance(entries, list):
        raise ValueError("Ranking entries must be a list")
    if ranking.get("status") == "pending":
        if entries:
            raise ValueError("Pending sources cannot assign university ranks")
        return
    if ranking.get("status") not in {"verified", "user-provided"}:
        raise ValueError("Unknown ranking verification status")
    if "2027" not in str(ranking.get("sourceTitle", "")):
        raise ValueError("The reviewed source must explicitly identify the 2027 edition")
    if ranking["status"] == "verified":
        source = urlparse(ranking.get("sourceURL", ""))
        if source.scheme != "https" or not (source.hostname == "usnews.com" or (source.hostname or "").endswith(".usnews.com")):
            raise ValueError("A publisher HTTPS source is required")
        date.fromisoformat(ranking.get("verifiedAt") or "")
    else:
        source = ranking.get("source", {})
        if source.get("type") != "user-provided-pdf" or source.get("officialWebsiteIndependentlyVerified") is not False:
            raise ValueError("User-provided PDFs must not be labeled as independently verified")
        path = (data_dir / source.get("file", "")).resolve()
        if not path.is_relative_to((data_dir / "sources").resolve()) or path.suffix.lower() != ".pdf":
            raise ValueError("The supplied PDF must be retained inside data/sources")
        contents = path.read_bytes()
        if not contents.startswith(b"%PDF-") or hashlib.sha256(contents).hexdigest() != source.get("sha256"):
            raise ValueError("The retained PDF does not match the recorded source checksum")
        date.fromisoformat(ranking.get("importedAt") or "")
    seen = set()
    for entry in entries:
        school_id, rank = entry.get("schoolId"), entry.get("rank")
        if school_id not in school_ids or school_id in seen:
            raise ValueError("Rankings must reference unique known schools")
        if isinstance(rank, bool) or not isinstance(rank, int) or not 1 <= rank <= 50:
            raise ValueError("Top-50 ranks must be integers from 1 to 50")
        seen.add(school_id)
    # Competition ranking preserves ties (1, 2, 2, 4). Do not cut a tie at #50.
    expected = 1
    for rank, count in sorted(Counter(row["rank"] for row in entries).items()):
        if rank != expected:
            raise ValueError("Incomplete or inconsistent ranking sequence")
        expected += count
    if expected <= 50:
        raise ValueError("A verified catalogue must cover every rank through 50")
    if ranking["status"] == "user-provided":
        if [row.get("sourceOrder") for row in entries] != list(range(1, len(entries) + 1)):
            raise ValueError("PDF rows must retain their original, complete order")
        if [row["rank"] for row in entries] != sorted(row["rank"] for row in entries):
            raise ValueError("The PDF table must be in ascending rank order")


def load_catalog(data_dir: Path = DATA) -> dict:
    directory = json.loads((data_dir / "schools.json").read_text(encoding="utf-8"))
    ranking = json.loads((data_dir / "usnews-2027.json").read_text(encoding="utf-8"))
    records = directory["schools"]
    ids = [row["id"] for row in records]
    if len(set(ids)) != len(ids):
        raise ValueError("Duplicate school identifiers")
    for record in records:
        if not all(record.get(key) for key in ("name", "english", "location", "homepage", "unitId")):
            raise ValueError("Institution facts are incomplete")
        if urlparse(record["homepage"]).scheme != "https":
            raise ValueError("School homepages must use HTTPS")
    validate_ranking(ranking, set(ids), data_dir)
    rank_by_id = {row["schoolId"]: row["rank"] for row in ranking["entries"]}
    row_by_id = {row["schoolId"]: row for row in ranking["entries"]}
    counts = Counter(rank_by_id.values())
    schools = []
    for record in records:
        school = dict(record)
        rank = rank_by_id.get(school["id"])
        example = PROGRAM_EXAMPLES.get(school["id"])
        school.update({
            "rankNumber": rank,
            "rank": f"#{rank}" + (" 并列" if counts[rank] > 1 else "") if rank else ("未列入本份 PDF" if ranking["status"] == "user-provided" else "2027 待核验"),
            "rankingSourceOrder": row_by_id.get(school["id"], {}).get("sourceOrder"),
            "rankingSourcePage": row_by_id.get(school["id"], {}).get("sourcePage"),
            "tier": ("10" if rank <= 10 else "30" if rank <= 30 else "50") if rank else "pending",
            "program": example[0] if example else "研究生项目 · 待选择",
            "deadline": example[1] if example else None,
            "status": example[2] if example else "了解项目",
            "url": example[3] if example else school["homepage"],
            "isProgramExample": bool(example),
        })
        if example:
            month, day = example[1].split(".")
            school.update(month={"01": "JAN", "02": "FEB", "12": "DEC"}[month], day=day)
        schools.append(school)
    source_pdf = None
    if ranking["status"] == "user-provided":
        source_pdf = base64.b64encode((data_dir / ranking["source"]["file"]).read_bytes()).decode("ascii")
    return {"schools": schools, "ranking": ranking, "sources": directory["sources"], "directoryNote": directory["description"], "sourcePDFBase64": source_pdf}
