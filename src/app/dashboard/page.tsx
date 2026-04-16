'use client';

import { ContractForm } from '@/components/ContractForm';

export default function DashboardPage() {
  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Новый договор аренды</h2>
        <p className="text-gray-500 text-sm mt-1">Заполните данные для генерации договора</p>
      </div>
      <ContractForm />
    </>
  );
}
