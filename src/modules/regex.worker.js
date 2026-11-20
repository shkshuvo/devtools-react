self.onmessage = ({ data: { pattern, flags, input } }) => {
  try {
    const re = new RegExp(pattern, flags),
      result = [];
    if (!re.global) {
      const m = re.exec(input);
      if (m) result.push({ match: m[0], index: m.index, groups: m.slice(1) });
    } else
      for (const m of input.matchAll(re)) {
        result.push({ match: m[0], index: m.index, groups: m.slice(1) });
        if (result.length >= 10000) break;
      }
    self.postMessage({ output: JSON.stringify(result, null, 2) });
  } catch (e) {
    self.postMessage({ error: e.message });
  }
};
