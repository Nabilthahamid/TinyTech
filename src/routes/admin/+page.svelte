<script lang="ts">
  import { onMount } from "svelte";
  import { AdminController } from "$controllers/AdminController";
  import { AnalyticsController } from "$controllers/AnalyticsController";
  import type { DashboardStats, TopSellingProduct, UserActivity } from "$models/Analytics";

  let stats: DashboardStats | null = null;
  let topProducts: TopSellingProduct[] = [];
  let recentActivity: UserActivity[] = [];
  let loading = true;
  let error: string | null = null;

  onMount(async () => {
    try {
      // Load dashboard data in parallel
      const [dashboardStats, topProductsData, recentActivityData] = await Promise.all([
        AnalyticsController.getDashboardStats(),
        AnalyticsController.getTopSellingProducts(5),
        AdminController.getRecentActivity(5)
      ]);

      stats = dashboardStats;
      topProducts = topProductsData;
      recentActivity = recentActivityData;
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to load dashboard data";
    } finally {
      loading = false;
    }
  });

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  function formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(num);
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
</script>

<svelte:head>
  <title>Dashboard - Admin</title>
</svelte:head>

{#if loading}
  <div class="text-center py-12">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
    <p class="text-gray-600">Loading dashboard...</p>
  </div>
{:else if error}
  <div class="text-center py-12">
    <div class="text-red-600 mb-4">
      <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <p class="text-lg font-medium">Error loading dashboard</p>
      <p class="text-sm text-gray-600">{error}</p>
    </div>
  </div>
{:else if stats}
  <div class="space-y-6">
    <!-- Page header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p class="mt-1 text-sm text-gray-500">
        Welcome back! Here's what's happening with your business today.
      </p>
    </div>

    <!-- Stats grid -->
    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <!-- Today's Revenue -->
      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
              </svg>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Today's Revenue</dt>
                <dd class="text-lg font-medium text-gray-900">{formatCurrency(stats.sales.today_revenue)}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <!-- Today's Orders -->
      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
              </svg>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Today's Orders</dt>
                <dd class="text-lg font-medium text-gray-900">{formatNumber(stats.sales.today_orders)}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <!-- Total Products -->
      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-6 w-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
              </svg>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Total Products</dt>
                <dd class="text-lg font-medium text-gray-900">{formatNumber(stats.products.total_products)}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <!-- Total Customers -->
      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-6 w-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
              </svg>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Total Customers</dt>
                <dd class="text-lg font-medium text-gray-900">{formatNumber(stats.customers.total_customers)}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Additional stats -->
    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <!-- Monthly Revenue -->
      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
              </svg>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Monthly Revenue</dt>
                <dd class="text-lg font-medium text-gray-900">{formatCurrency(stats.sales.month_revenue)}</dd>
                <dd class="text-sm text-gray-500">
                  <span class={stats.sales.growth_percentage >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {stats.sales.growth_percentage >= 0 ? '+' : ''}{stats.sales.growth_percentage.toFixed(1)}%
                  </span>
                  vs last month
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <!-- Pending Orders -->
      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-6 w-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Pending Orders</dt>
                <dd class="text-lg font-medium text-gray-900">{formatNumber(stats.orders.pending_orders)}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <!-- Low Stock -->
      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Low Stock</dt>
                <dd class="text-lg font-medium text-gray-900">{formatNumber(stats.products.low_stock_products)}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <!-- Average Order Value -->
      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-6 w-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
              </svg>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Avg Order Value</dt>
                <dd class="text-lg font-medium text-gray-900">{formatCurrency(stats.orders.average_order_value)}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts and tables -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <!-- Top Selling Products -->
      <div class="bg-white shadow rounded-lg">
        <div class="px-4 py-5 sm:p-6">
          <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">Top Selling Products</h3>
          {#if topProducts.length > 0}
            <div class="space-y-3">
              {#each topProducts as product, index}
                <div class="flex items-center justify-between">
                  <div class="flex items-center">
                    <span class="text-sm font-medium text-gray-500 w-6">#{index + 1}</span>
                    <div class="ml-3">
                      <p class="text-sm font-medium text-gray-900">{product.product_name}</p>
                      <p class="text-sm text-gray-500">SKU: {product.sku}</p>
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-medium text-gray-900">{formatNumber(product.total_sold)} sold</p>
                    <p class="text-sm text-gray-500">{formatCurrency(product.total_revenue)}</p>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-gray-500 text-sm">No sales data available</p>
          {/if}
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="bg-white shadow rounded-lg">
        <div class="px-4 py-5 sm:p-6">
          <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Orders</h3>
          {#if recentActivity.length > 0}
            <div class="space-y-3">
              {#each recentActivity as activity}
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-gray-900">Order #{activity.order_number}</p>
                    <p class="text-sm text-gray-500">{activity.user?.name || 'Guest'}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-medium text-gray-900">{formatCurrency(activity.total_amount)}</p>
                    <p class="text-sm text-gray-500">{formatDate(activity.created_at)}</p>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-gray-500 text-sm">No recent orders</p>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
