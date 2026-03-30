import { useI18n } from '@/lib/i18n';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const langs = [
  { code: 'en' as const, label: 'English' },
  { code: 'fr' as const, label: 'Français' },
  { code: 'ar' as const, label: 'العربية' },
];

export default function LanguageSwitcher() {
  const { lang, setLang } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Globe className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {langs.map(l => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLang(l.code)}
            className={lang === l.code ? 'font-semibold text-primary' : ''}
          >
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
