# Deployment timestamp: 2024-12-19 00:00:00 UTC
"""
Write-Ahead Log (WAL) Manager for YeetCode FastAPI

Provides crash recovery by logging all cache writes to a persistent file.
WAL survives server crashes and is replayed on startup to restore cache state.
"""

import os
import json
import time
import threading
from typing import Dict, List, Optional
from pathlib import Path
from logger import info, error, warning

class WALManager:
    """
    Write-Ahead Log manager for cache persistence

    WAL Format: JSON Lines (one JSON object per line)
    Each entry: {
        "timestamp": float,
        "sequence": int,
        "operation": "UPDATE"|"PUT"|"DELETE"|"INCREMENT",
        "table": "USERS_TABLE"|"BOUNTIES_TABLE"|etc,
        "key": dict,
        "data": dict,
        "cache_type": str
    }
    """

    def __init__(self, wal_file_path: str = None):
        """
        Initialize WAL manager

        Args:
            wal_file_path: Path to WAL file. Defaults to /tmp/yeetcode_wal.log
        """
        # Use persistent location outside project directory
        if wal_file_path is None:
            wal_dir = Path("/tmp/yeetcode")
            wal_dir.mkdir(parents=True, exist_ok=True)
            wal_file_path = str(wal_dir / "wal.log")

        self._wal_file = wal_file_path
        self._lock = threading.RLock()
        self._sequence = 0
        self._file_handle = None

        # Initialize WAL file
        self._init_wal_file()

        info(f"📝 WAL Manager initialized: {self._wal_file}")

    def _init_wal_file(self):
        """Initialize WAL file if it doesn't exist"""
        try:
            if not os.path.exists(self._wal_file):
                Path(self._wal_file).touch()
                info(f"✨ Created new WAL file: {self._wal_file}")
            else:
                # Count existing entries to set sequence number
                with open(self._wal_file, 'r') as f:
                    lines = f.readlines()
                    self._sequence = len(lines)
                info(f"📖 Found existing WAL file with {self._sequence} entries")
        except Exception as e:
            error(f"Failed to initialize WAL file: {e}")
            raise

    def append(self, operation: str, table: str, key: Dict, data: Dict, cache_type: str) -> bool:
        """
        Append a write operation to the WAL

        Args:
            operation: Operation type (UPDATE, PUT, DELETE, INCREMENT)
            table: DynamoDB table name
            key: Item key (e.g., {"username": "john"})
            data: Data to write
            cache_type: Cache type identifier

        Returns:
            True if successful, False otherwise
        """
        with self._lock:
            try:
                entry = {
                    "timestamp": time.time(),
                    "sequence": self._sequence,
                    "operation": operation,
                    "table": table,
                    "key": key,
                    "data": data,
                    "cache_type": cache_type
                }

                # Append to WAL file with fsync for durability
                with open(self._wal_file, 'a') as f:
                    f.write(json.dumps(entry) + '\n')
                    f.flush()
                    os.fsync(f.fileno())  # Force write to disk

                self._sequence += 1
                return True

            except Exception as e:
                error(f"Failed to append to WAL: {e}")
                return False

    def replay(self, cache_manager) -> int:
        """
        Replay WAL entries into cache on startup

        Args:
            cache_manager: CacheManager instance to replay entries into

        Returns:
            Number of entries replayed
        """
        with self._lock:
            try:
                if not os.path.exists(self._wal_file):
                    info("No WAL file to replay")
                    return 0

                replayed = 0
                with open(self._wal_file, 'r') as f:
                    for line_num, line in enumerate(f, 1):
                        line = line.strip()
                        if not line:
                            continue

                        try:
                            entry = json.loads(line)

                            # Apply entry to cache based on operation type
                            cache_type = entry.get('cache_type')
                            data = entry.get('data')
                            key = entry.get('key')

                            if cache_type and data:
                                # Determine identifier from key
                                identifier = ""
                                if 'username' in key:
                                    identifier = key['username']
                                elif 'id' in key:
                                    identifier = key['id']
                                elif 'duelId' in key:
                                    identifier = key['duelId']

                                # Write to cache and mark as dirty
                                cache_manager._write_to_cache_internal(
                                    cache_type=cache_type,
                                    data=data,
                                    identifier=identifier,
                                    mark_dirty=True
                                )

                                replayed += 1

                        except json.JSONDecodeError as e:
                            warning(f"Skipping corrupted WAL entry at line {line_num}: {e}")
                            continue

                info(f"🔄 Replayed {replayed} WAL entries into cache")
                return replayed

            except Exception as e:
                error(f"Failed to replay WAL: {e}")
                return 0

    def clear(self) -> bool:
        """
        Clear the WAL file after successful cache dump

        Returns:
            True if successful, False otherwise
        """
        with self._lock:
            try:
                # Truncate WAL file
                with open(self._wal_file, 'w') as f:
                    pass

                self._sequence = 0
                info("🧹 WAL file cleared after successful dump")
                return True

            except Exception as e:
                error(f"Failed to clear WAL: {e}")
                return False

    def get_entries_since(self, sequence: int) -> List[Dict]:
        """
        Get all WAL entries since a specific sequence number

        Args:
            sequence: Sequence number to start from

        Returns:
            List of WAL entries
        """
        with self._lock:
            try:
                entries = []
                with open(self._wal_file, 'r') as f:
                    for line in f:
                        line = line.strip()
                        if not line:
                            continue

                        try:
                            entry = json.loads(line)
                            if entry.get('sequence', 0) >= sequence:
                                entries.append(entry)
                        except json.JSONDecodeError:
                            continue

                return entries

            except Exception as e:
                error(f"Failed to get WAL entries: {e}")
                return []

    def get_stats(self) -> Dict:
        """Get WAL statistics"""
        with self._lock:
            try:
                if not os.path.exists(self._wal_file):
                    return {
                        "exists": False,
                        "entries": 0,
                        "size_bytes": 0
                    }

                size = os.path.getsize(self._wal_file)

                return {
                    "exists": True,
                    "entries": self._sequence,
                    "size_bytes": size,
                    "size_kb": round(size / 1024, 2),
                    "path": self._wal_file
                }

            except Exception as e:
                error(f"Failed to get WAL stats: {e}")
                return {"error": str(e)}


# Global WAL manager instance
wal_manager = WALManager()

