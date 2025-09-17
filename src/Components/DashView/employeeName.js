// Utility to resolve employee name from id
export default function employeeName(id, employees) {
  if (!id || !employees) return '';
  const emp = employees.find(e => String(e.id) === String(id) || String(e.employeeId) === String(id));
  return emp ? (emp.name || emp.fullName || emp.firstName + ' ' + emp.lastName) : String(id);
}
