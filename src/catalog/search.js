export const match = (t, q) =>
  (t.name + " " + t.id + " " + (t.description || "") + " " + t.category)
    .toLowerCase()
    .includes(q.trim().toLowerCase());
