const fs = require('fs');
let code = fs.readFileSync('src/components/professional/ProfessionalDashboard.tsx', 'utf-8');

const check = `export const ProfessionalDashboard: React.FC<Props> = ({ professionalId, professionalName }) => {
  if (import.meta.env && import.meta.env.PROD && professionalId === 'dr-smith-456') {
    return <div className="p-8 text-red-600 bg-red-50 border border-red-200 rounded-lg m-4">CRITICAL SECURITY ERROR: Demo professional identities cannot be used in a production environment.</div>;
  }`;

code = code.replace("export const ProfessionalDashboard: React.FC<Props> = ({ professionalId, professionalName }) => {", check);
fs.writeFileSync('src/components/professional/ProfessionalDashboard.tsx', code);
