'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Editor', href: '/editor' },
  { name: 'Export', href: '/export' },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-2">
      {navigation.map((item) => (
        <Link key={item.name} href={item.href}>
          <Button
            variant={pathname === item.href ? 'default' : 'ghost'}
            size="sm"
          >
            {item.name}
          </Button>
        </Link>
      ))}
    </nav>
  );
}
