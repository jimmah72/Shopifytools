import DashboardLayout from '@/components/layout/DashboardLayout'
import Card from '@/components/ui/Card'

export default function AdSpendPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Ad Spend</h1>
          <p className="mt-2 text-sm text-gray-700">
            Track your advertising costs and ROI
          </p>
        </div>

        <Card>
          <div className="text-gray-500">Ad spend analytics will be displayed here</div>
        </Card>
      </div>
    </DashboardLayout>
  )
} 