#!/usr/bin/env python3
"""Build a Prisma-compatible client.p12 from Square Cloud certificate API JSON."""

import argparse
import base64
import json
import subprocess
import sys
import tempfile
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Create client.p12 from Square Cloud credentials/certificate response.",
    )
    parser.add_argument("certificate_json", help="Path to API JSON response file")
    parser.add_argument(
        "output_p12",
        nargs="?",
        default="client.p12",
        help="Output PKCS#12 path (default: client.p12)",
    )
    args = parser.parse_args()

    payload = json.loads(Path(args.certificate_json).read_text(encoding="utf-8"))
    if payload.get("status") != "success":
        raise SystemExit(f"Certificate API error: {payload}")

    pem_bytes = base64.b64decode(payload["response"]["certificate"])
    pem_text = pem_bytes.decode("utf-8")

    if "BEGIN PRIVATE KEY" not in pem_text or "BEGIN CERTIFICATE" not in pem_text:
        Path(args.output_p12).write_bytes(base64.b64decode(payload["response"]["certificate"]))
        print(f"Wrote raw p12 bytes to {args.output_p12}")
        return 0

    key_part = pem_text.split("-----END")[0] + "-----END PRIVATE KEY-----\n"
    cert_part = (
        "-----BEGIN CERTIFICATE-----"
        + pem_text.split("-----BEGIN CERTIFICATE-----", 1)[1]
    )

    out_path = Path(args.output_p12)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        key_path = Path(tmp) / "client.key"
        crt_path = Path(tmp) / "client.crt"
        key_path.write_text(key_part, encoding="utf-8")
        crt_path.write_text(cert_part, encoding="utf-8")
        subprocess.run(
            [
                "openssl",
                "pkcs12",
                "-export",
                "-out",
                str(out_path),
                "-inkey",
                str(key_path),
                "-in",
                str(crt_path),
                "-password",
                "pass:squarecloud",
                "-certpbe",
                "AES-256-CBC",
                "-keypbe",
                "AES-256-CBC",
                "-macalg",
                "SHA256",
            ],
            check=True,
        )

    out_path.chmod(0o600)
    print(f"Wrote {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
