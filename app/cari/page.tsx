import { Suspense } from 'react';
import SearchView from '@/components/SearchView';

export const metadata = { title: 'Cari' };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SearchView />
    </Suspense>
  );
}
