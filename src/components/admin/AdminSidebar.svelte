<script lang="ts">
  import { page } from "$app/stores";
  
  const navigation = [
    {
      name: "Dashboard",
      href: "/admin",
      icon: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z",
      current: $page.url.pathname === "/admin"
    },
    {
      name: "Products",
      href: "/admin/products",
      icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
      current: $page.url.pathname.startsWith("/admin/products")
    },
    {
      name: "Categories",
      href: "/admin/categories",
      icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
      current: $page.url.pathname.startsWith("/admin/categories")
    },
    {
      name: "Orders",
      href: "/admin/orders",
      icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z",
      current: $page.url.pathname.startsWith("/admin/orders")
    },
    {
      name: "Inventory",
      href: "/admin/inventory",
      icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
      current: $page.url.pathname.startsWith("/admin/inventory")
    },
    {
      name: "Discounts",
      href: "/admin/discounts",
      icon: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z",
      current: $page.url.pathname.startsWith("/admin/discounts")
    },
    {
      name: "Users",
      href: "/admin/users",
      icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z",
      current: $page.url.pathname.startsWith("/admin/users")
    },
    {
      name: "Analytics",
      href: "/admin/analytics",
      icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
      current: $page.url.pathname.startsWith("/admin/analytics")
    }
  ];

  function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ');
  }
</script>

<!-- Sidebar -->
<div class="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
  <div class="flex flex-col flex-grow bg-gray-800 pt-5 pb-4 overflow-y-auto">
    <div class="flex items-center flex-shrink-0 px-4">
      <h1 class="text-xl font-bold text-white">Admin Dashboard</h1>
    </div>
    
    <nav class="mt-5 flex-1 px-2 space-y-1">
      {#each navigation as item}
        <a
          href={item.href}
          class={classNames(
            item.current
              ? 'bg-gray-900 text-white'
              : 'text-gray-300 hover:bg-gray-700 hover:text-white',
            'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
          )}
        >
          <svg
            class={classNames(
              item.current ? 'text-gray-300' : 'text-gray-400 group-hover:text-gray-300',
              'mr-3 flex-shrink-0 h-6 w-6'
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} />
          </svg>
          {item.name}
        </a>
      {/each}
    </nav>
  </div>
</div>
