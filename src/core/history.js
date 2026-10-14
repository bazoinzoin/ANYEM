// Historique Annuler / Rétablir : instantanés JSON du projet avant chaque modification.

export function createHistory(limit = 200) {
  const undo = [];
  const redo = [];
  return {
    // `snapshot` = état AVANT la modification nommée `label`.
    push(snapshot, label) {
      undo.push({ snapshot, label });
      if (undo.length > limit) undo.shift();
      redo.length = 0;
    },
    undo(current) {
      const entry = undo.pop();
      if (!entry) return null;
      redo.push({ snapshot: current, label: entry.label });
      return entry;
    },
    redo(current) {
      const entry = redo.pop();
      if (!entry) return null;
      undo.push({ snapshot: current, label: entry.label });
      return entry;
    },
    clear() {
      undo.length = 0;
      redo.length = 0;
    },
    get canUndo() { return undo.length > 0; },
    get canRedo() { return redo.length > 0; },
    get undoLabel() { return undo.length ? undo[undo.length - 1].label : ''; },
    get redoLabel() { return redo.length ? redo[redo.length - 1].label : ''; },
  };
}
