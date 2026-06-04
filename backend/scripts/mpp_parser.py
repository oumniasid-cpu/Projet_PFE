import sys
import json
from mpxj.reader import UniversalProjectReader


def parse_mpp(file_path):
    try:
        # 1. Read the MPP file
        reader = UniversalProjectReader()
        project = reader.read(file_path)

        tasks_list = []

        # 2. Loop through all tasks
        for task in project.getTasks():
            # Skip the root summary task (ID 0) and null tasks
            if task is None:
                continue
            if task.getID() is None or task.getID() == 0:
                continue
            # Skip summary/parent tasks — they are roll-ups, not real work items
            # Remove this check if you want to keep WBS summary rows
            if task.getSummary():
                continue

            # ── Safe date extraction ──────────────────────────────────────────
            # getStart() / getFinish() return Java LocalDateTime objects in mpxj.
            # Convert via str() — format is "YYYY-MM-DD HH:MM" ; slice date part.
            raw_start  = task.getStart()
            raw_finish = task.getFinish()
            start_date = str(raw_start)[:10]  if raw_start  else None
            end_date   = str(raw_finish)[:10] if raw_finish else None

            # ── Duration ─────────────────────────────────────────────────────
            # getDuration() returns an mpxj Duration object, not a plain number.
            # .toString() gives e.g. "5.0d" ; .getDuration() gives the numeric value.
            raw_duration = task.getDuration()
            if raw_duration is not None:
                duration_value = raw_duration.getDuration()   # float
                duration_units = str(raw_duration.getUnits()) # e.g. "DAYS"
                duration_str   = f"{duration_value} {duration_units}"
            else:
                duration_value = 0.0
                duration_str   = "0.0 DAYS"

            # ── Progress ──────────────────────────────────────────────────────
            # getPercentComplete() returns a Number (Java) or Python int/float.
            # Always guard with a None check — never check truthiness (0% is falsy).
            pct = task.getPercentComplete()
            progress = float(pct) if pct is not None else 0.0

            # ── Cost ──────────────────────────────────────────────────────────
            # getCost() returns an mpxj Number (backed by BigDecimal in Java).
            # In the Python binding, call float() directly — no .toDecimal() method.
            raw_cost = task.getCost()
            cost = float(raw_cost) if raw_cost is not None else 0.0

            # ── Priority ─────────────────────────────────────────────────────
            # getPriority() returns an mpxj Priority object.
            # .getValue() returns the integer (500 = Medium by default).
            raw_priority = task.getPriority()
            priority = int(raw_priority.getValue()) if raw_priority is not None else 500

            # ── Outline / hierarchy ───────────────────────────────────────────
            # getOutlineLevel() tells you the WBS depth (1 = top-level task).
            outline_level = task.getOutlineLevel() or 1

            # ── Parent task ID ────────────────────────────────────────────────
            parent_task = task.getParentTask()
            parent_id   = int(parent_task.getID()) if (
                parent_task is not None and parent_task.getID() not in (None, 0)
            ) else None

            task_data = {
                "id":            int(task.getID()),
                "name":          task.getName(),
                "start_date":    start_date,
                "end_date":      end_date,
                "duration":      duration_str,
                "duration_days": duration_value,
                "progress":      progress,
                "cost":          cost,
                "priority":      priority,
                "outline_level": outline_level,
                "parent_id":     parent_id,
            }

            # Only include tasks that have a name (skip blank placeholder rows)
            if task_data["name"]:
                tasks_list.append(task_data)

        # 3. Output JSON to stdout — Node.js reads this via child_process
        print(json.dumps(tasks_list, ensure_ascii=False))

    except FileNotFoundError:
        print(json.dumps({"error": f"Fichier introuvable : {file_path}"}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Aucun fichier spécifié. Usage : python parse_mpp.py <file.mpp>"}))
        sys.exit(1)

    parse_mpp(sys.argv[1])