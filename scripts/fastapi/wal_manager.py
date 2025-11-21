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
        self._checkpoint_file = wal_file_path.replace('.log', '.checkpoint')
        self._lock = threading.RLock()
        self._sequence = 0
        self._last_applied_sequence = -1
        self._file_handle = None

        # Initialize WAL file and checkpoint
        self._init_wal_file()
        self._load_checkpoint()

        info(f"📝 WAL Manager initialized: {self._wal_file} (checkpoint: {self._last_applied_sequence})")

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

        WARNING: This resets sequence to 0, breaking checkpoint-based replay!
        Use clear_up_to(sequence) instead for production code.

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

    def clear_up_to(self, max_sequence: int) -> bool:
        """
        Clear WAL entries up to and including max_sequence, keeping later entries

        This is the correct way to clear WAL after partial sync without breaking
        the checkpoint system or losing concurrent writes.

        Args:
            max_sequence: Clear all entries with sequence <= this value

        Returns:
            True if successful, False otherwise
        """
        with self._lock:
            try:
                # Read all entries
                entries_to_keep = []
                with open(self._wal_file, 'r') as f:
                    for line in f:
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            entry = json.loads(line)
                            # Keep entries with sequence > max_sequence
                            if entry.get('sequence', 0) > max_sequence:
                                entries_to_keep.append(entry)
                        except json.JSONDecodeError:
                            continue

                # Rewrite WAL file with only entries to keep
                with open(self._wal_file, 'w') as f:
                    for entry in entries_to_keep:
                        f.write(json.dumps(entry) + '\n')
                    f.flush()
                    os.fsync(f.fileno())

                info(f"🧹 WAL file cleared up to sequence {max_sequence}, kept {len(entries_to_keep)} entries")
                return True

            except Exception as e:
                error(f"Failed to clear WAL up to sequence {max_sequence}: {e}")
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

    def _load_checkpoint(self) -> None:
        """Load last applied sequence from checkpoint file"""
        try:
            if os.path.exists(self._checkpoint_file):
                with open(self._checkpoint_file, 'r') as f:
                    data = json.load(f)
                    self._last_applied_sequence = data.get('last_applied_sequence', -1)
                    info(f"📍 Loaded checkpoint: last_applied_sequence = {self._last_applied_sequence}")
            else:
                info("📍 No checkpoint file found, starting from sequence -1")
        except Exception as e:
            error(f"Failed to load checkpoint: {e}, starting from -1")
            self._last_applied_sequence = -1

    def get_last_applied_sequence(self) -> int:
        """Get the sequence number of the last successfully applied WAL entry"""
        with self._lock:
            return self._last_applied_sequence

    def set_last_applied_sequence(self, sequence: int) -> bool:
        """
        Update the last applied sequence checkpoint (atomic write)

        Args:
            sequence: Sequence number of last successfully applied entry

        Returns:
            True if successful, False otherwise
        """
        with self._lock:
            try:
                # Write to temp file first, then atomic rename
                temp_file = self._checkpoint_file + '.tmp'
                with open(temp_file, 'w') as f:
                    json.dump({'last_applied_sequence': sequence}, f)
                    f.flush()
                    os.fsync(f.fileno())

                # Atomic rename (overwrites existing checkpoint)
                os.replace(temp_file, self._checkpoint_file)

                self._last_applied_sequence = sequence
                return True
            except Exception as e:
                error(f"Failed to save checkpoint: {e}")
                return False

    def get_stats(self) -> Dict:
        """Get WAL statistics"""
        with self._lock:
            try:
                if not os.path.exists(self._wal_file):
                    return {
                        "exists": False,
                        "entries": 0,
                        "size_bytes": 0,
                        "last_applied_sequence": self._last_applied_sequence
                    }

                size = os.path.getsize(self._wal_file)

                return {
                    "exists": True,
                    "entries": self._sequence,
                    "size_bytes": size,
                    "size_kb": round(size / 1024, 2),
                    "path": self._wal_file,
                    "last_applied_sequence": self._last_applied_sequence
                }

            except Exception as e:
                error(f"Failed to get WAL stats: {e}")
                return {"error": str(e)}


# Global WAL manager instance
wal_manager = WALManager()

