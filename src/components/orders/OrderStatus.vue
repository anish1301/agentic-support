<template>
  <span 
    :class="[
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      statusClasses[status] || statusClasses.default
    ]"
  >
    <span :class="['w-1.5 h-1.5 mr-1.5 rounded-full', dotClasses[status] || dotClasses.default]"></span>
    {{ statusLabels[status] || status }}
  </span>
</template>

<script>
export default {
  name: 'OrderStatus',
  props: {
    status: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      statusLabels: {
        confirmed: 'Confirmed',
        shipped: 'Shipped',
        delivered: 'Delivered',
        cancelled: 'Cancelled',
        processing: 'Processing',
        refunded: 'Refunded'
      },
      statusClasses: {
        confirmed: 'bg-yellow-100 text-yellow-800',
        shipped: 'bg-blue-100 text-blue-800',
        delivered: 'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-800',
        processing: 'bg-purple-100 text-purple-800',
        refunded: 'bg-gray-100 text-gray-800',
        default: 'bg-gray-100 text-gray-800'
      },
      dotClasses: {
        confirmed: 'bg-yellow-400',
        shipped: 'bg-blue-400',
        delivered: 'bg-green-400',
        cancelled: 'bg-red-400',
        processing: 'bg-purple-400',
        refunded: 'bg-gray-400',
        default: 'bg-gray-400'
      }
    }
  }
}
</script>
