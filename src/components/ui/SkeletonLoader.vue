<template>
  <div class="animate-pulse">
    <!-- Header Skeleton -->
    <div v-if="showHeader" class="mb-4">
      <div class="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
      <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
    </div>

    <!-- Content based on type -->
    <div v-if="type === 'chat'" class="space-y-4">
      <div v-for="n in count" :key="n" class="flex space-x-3">
        <!-- Avatar -->
        <div class="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0"></div>
        <!-- Message -->
        <div class="flex-1 space-y-2">
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    </div>

    <div v-else-if="type === 'order-card'" class="space-y-4">
      <div v-for="n in count" :key="n" class="border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4">
        <!-- Order header -->
        <div class="flex justify-between items-start">
          <div class="space-y-2 flex-1">
            <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          </div>
          <div class="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
        </div>
        
        <!-- Product items -->
        <div class="space-y-3">
          <div v-for="i in 2" :key="i" class="flex space-x-3">
            <div class="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div class="flex-1 space-y-2">
              <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          </div>
        </div>
        
        <!-- Action buttons -->
        <div class="flex space-x-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div class="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
          <div class="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
        </div>
      </div>
    </div>

    <div v-else-if="type === 'table'" class="space-y-2">
      <!-- Table header -->
      <div class="grid grid-cols-4 gap-4 pb-2">
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
      <!-- Table rows -->
      <div v-for="n in count" :key="n" class="grid grid-cols-4 gap-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    </div>

    <div v-else-if="type === 'form'" class="space-y-4">
      <div v-for="n in count" :key="n" class="space-y-2">
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
        <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
      <div class="flex space-x-2 pt-4">
        <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
        <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
      </div>
    </div>

    <div v-else-if="type === 'list'" class="space-y-3">
      <div v-for="n in count" :key="n" class="flex space-x-3 items-center">
        <div class="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0"></div>
        <div class="flex-1 space-y-2">
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    </div>

    <div v-else class="space-y-3">
      <!-- Generic skeleton -->
      <div v-for="n in count" :key="n" class="space-y-2">
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SkeletonLoader',
  props: {
    type: {
      type: String,
      default: 'default',
      validator: (value) => [
        'default', 'chat', 'order-card', 'table', 'form', 'list'
      ].includes(value)
    },
    count: {
      type: Number,
      default: 3
    },
    showHeader: {
      type: Boolean,
      default: false
    }
  }
}
</script>

<style scoped>
@keyframes shimmer {
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
}

.animate-pulse > div {
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
  background-size: 200px 100%;
  animation: shimmer 1.5s infinite;
}

.dark .animate-pulse > div {
  background: linear-gradient(90deg, #374151 25%, #4b5563 50%, #374151 75%);
  background-size: 200px 100%;
}

.dark .animate-pulse div div {
  background: linear-gradient(90deg, #374151 25%, #4b5563 50%, #374151 75%);
  background-size: 200px 100%;
}
</style>
