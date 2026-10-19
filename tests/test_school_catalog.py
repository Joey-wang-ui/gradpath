"""Validate source separation and ranking coverage without inventing real ranks."""

from copy import deepcopy
import hashlib
import json
from pathlib import Path
import shutil

import pytest

from scripts.school_catalog import load_catalog, validate_ranking


def hypothetical_ranking():
    """Entirely fictional IDs and ranks, never written into the shipped data."""
    return {
        "year": 2027,
        "publisher": "U.S. News & World Report",
        "category": "National Universities",
        "status": "verified",
        "sourceURL": "https://www.usnews.com/best-colleges/rankings/national-universities",
        "sourceTitle": "2027 validation test fixture, not factual rankings",
        "verifiedAt": "2026-10-19",
        "entries": [{"schoolId": f"fictional-{i}", "rank": i} for i in range(1, 51)],
    }


def test_directory_matches_uploaded_pdf_without_inheriting_old_ranks():
    catalog = load_catalog()
    assert len(catalog["schools"]) == 53
    assert len({r["unitId"] for r in catalog["schools"]}) == 53
    assert catalog["ranking"]["status"] == "user-provided"
    assert catalog["ranking"]["verifiedAt"] is None
    assert len(catalog["ranking"]["entries"]) == 51
    ranked = {school["id"]: school for school in catalog["schools"] if school["rankNumber"] is not None}
    assert len(ranked) == 51
    assert ranked["mit"]["rankNumber"] == 1
    assert ranked["princeton"]["rankNumber"] == 2
    assert ranked["stanford"]["rankNumber"] == 5
    assert ranked["wake-forest"]["rankNumber"] == 34
    assert ranked["villanova"]["rankNumber"] == 42
    assert ranked["case-western"]["rankNumber"] == 44
    assert {school["id"] for school in catalog["schools"] if school["rankNumber"] is None} == {"purdue", "georgia"}
    assert [school["rankNumber"] for school in ranked.values()].count(49) == 3
    assert all(school["deadline"] is None for school in catalog["schools"] if not school["isProgramExample"])


@pytest.mark.parametrize("change", [
    {"year": 2026},
    {"category": "Global Universities"},
    {"sourceURL": "https://usnews.com.example.org/rankings"},
    {"verifiedAt": None},
    {"status": "pending"},
])
def test_reject_wrong_edition_unreviewed_source_or_mixed_status(change):
    ranking = hypothetical_ranking()
    ranking.update(change)
    with pytest.raises((ValueError, TypeError)):
        validate_ranking(ranking, {f"fictional-{i}" for i in range(1, 52)})


def test_preserve_ties_at_boundary_instead_of_truncating_to_fifty_rows():
    ranking = hypothetical_ranking()
    ranking["entries"] = ranking["entries"][:48] + [
        {"schoolId": f"fictional-{i}", "rank": 49} for i in range(49, 52)
    ]
    validate_ranking(ranking, {f"fictional-{i}" for i in range(1, 52)})
    assert len(ranking["entries"]) == 51


def test_reject_partial_or_inconsistent_positions():
    ranking = hypothetical_ranking()
    for entries in (ranking["entries"][:10], ranking["entries"][:3] + ranking["entries"][4:]):
        partial = deepcopy(ranking)
        partial["entries"] = entries
        with pytest.raises(ValueError):
            validate_ranking(partial, {f"fictional-{i}" for i in range(1, 51)})


def test_source_pdf_checksum_and_every_extracted_row():
    data_dir = Path(__file__).resolve().parents[1] / "frontend/data"
    ranking = json.loads((data_dir / "usnews-2027.json").read_text())
    original = (data_dir / ranking["source"]["file"]).read_bytes()
    assert hashlib.sha256(original).hexdigest() == ranking["source"]["sha256"]
    rows = ranking["entries"]
    assert [row["sourceOrder"] for row in rows] == list(range(1, 52))
    assert [row["sourcePage"] for row in rows] == [1] * 32 + [2] * 19
    assert [row["rank"] for row in rows] == [
        1, 2, 3, 4, 5, 5, 7, 8, 9, 9, 9, 12, 12, 14, 14, 16, 16, 16, 16,
        20, 20, 20, 23, 23, 25, 26, 27, 27, 29, 29, 31, 31, 31,
        34, 34, 34, 34, 34, 34, 34, 34, 42, 42, 44, 44, 44, 44, 44, 49, 49, 49,
    ]


def test_reject_modified_pdf_and_falsely_verified_claim(tmp_path):
    original = Path(__file__).resolve().parents[1] / "frontend/data"
    shutil.copytree(original, tmp_path / "data")
    data_dir = tmp_path / "data"
    ranking = json.loads((data_dir / "usnews-2027.json").read_text())
    school_ids = {school["id"] for school in load_catalog()["schools"]}
    falsely_verified = deepcopy(ranking)
    falsely_verified["source"]["officialWebsiteIndependentlyVerified"] = True
    with pytest.raises(ValueError, match="independently verified"):
        validate_ranking(falsely_verified, school_ids, data_dir)
    pdf = data_dir / ranking["source"]["file"]
    pdf.write_bytes(pdf.read_bytes() + b"changed")
    with pytest.raises(ValueError, match="checksum"):
        validate_ranking(ranking, school_ids, data_dir)
