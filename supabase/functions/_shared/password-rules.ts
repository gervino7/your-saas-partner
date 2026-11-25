export function reglesNonRespectees(pwd: string): string[] {
  const r: string[] = [];
  if (pwd.length < 8) r.push('Au moins 8 caractères');
  if (!/[A-Z]/.test(pwd)) r.push('Une lettre majuscule');
  if (!/[a-z]/.test(pwd)) r.push('Une lettre minuscule');
  if (!/[0-9]/.test(pwd)) r.push('Un chiffre');
  return r;
}
