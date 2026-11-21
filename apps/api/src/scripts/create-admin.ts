import 'dotenv/config';
import { prisma } from '@mf/database';
import { createAdminAccount } from '../modules/admin-auth/service';

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main(): Promise<void> {
  const email = (argument('--email') ?? process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
  const password = argument('--password') ?? process.env.ADMIN_PASSWORD ?? '';
  const firstName = argument('--firstName') ?? process.env.ADMIN_FIRST_NAME ?? 'Admin';
  const lastName = argument('--lastName') ?? process.env.ADMIN_LAST_NAME ?? 'MF Business';

  if (!email || !password) {
    console.error(
      'Usage : npm run admin:create -- --email admin@exemple.com --password "MotDePasseFort" [--firstName Prénom] [--lastName Nom]',
    );
    process.exitCode = 1;
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('Adresse e-mail invalide.');
    process.exitCode = 1;
    return;
  }

  if (password.length < 12) {
    console.error('Le mot de passe administrateur doit contenir au moins 12 caractères.');
    process.exitCode = 1;
    return;
  }

  const user = await createAdminAccount({ email, password, firstName, lastName });
  console.log(`Administrateur prêt : ${user.email} (${user.role})`);
  console.log('La 2FA sera configurée à la première connexion.');
  console.log('Ne partagez jamais ce mot de passe et changez-le après la configuration.');
}

main()
  .catch((error) => {
    console.error('Création administrateur impossible :', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
