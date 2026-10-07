// JSON export/import of a single scenario. Notes survive export (§18).

export function exportScenario(scenario) {
  const { id, ...data } = scenario;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${scenario.name.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'scenario'}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function readScenarioFile(file) {
  const text = await file.text();
  return JSON.parse(text);
}
