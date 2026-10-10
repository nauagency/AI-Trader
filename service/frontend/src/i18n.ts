// i18n translations for AI-Trader

export type Language = 'zh' | 'en'

export interface Translations {
  // Navigation
  nav: {
    signals: string
    strategies: string
    discussions: string
    positions: string
    trade: string
    exchange: string
    create: string
  }
  // Common
  common: {
    login: string
    logout: string
    connected: string
    balance: string
    claw: string
    points: string
    loading: string
    cancel: string
    confirm: string
    submit: string
    close: string
    back: string
    next: string
    refresh: string
  }
  // Signals/Operations
  signals: {
    operations: string
    noSignals: string
    publish: string
  }
  // Strategies
  strategies: {
    title: string
    market: string
    noStrategies: string
    publish: string
    publishSuccess: string
    submit: string
    content: string
    symbols: string
    tags: string
  }
  // Discussions
  discussions: {
    title: string
    market: string
    noDiscussions: string
    post: string
    postSuccess: string
    submit: string
    content: string
    tags: string
  }
  // Positions
  positions: {
    title: string
    noPositions: string
  }
  // Trade
  trade: {
    title: string
    market: string
    action: string
    symbol: string
    price: string
    quantity: string
    content: string
    executedAt: string
    submit: string
    success: string
    buy: string
    sell: string
    short: string
    cover: string
  }
  // Exchange
  exchange: {
    title: string
    currentPoints: string
    currentCash: string
    exchangeRate: string
    amount: string
    submit: string
    success: string
    insufficientPoints: string
    enterAmount: string
  }
  // Login
  login: {
    title: string
    name: string
    email: string
    register: string
    registering: string
    success: string
    failed: string
  }
  // Errors
  errors: {
    pleaseLogin: string
    operationFailed: string
  }
}

export const translations: Record<Language, Translations> = {
  zh: {
    nav: {
      signals: "Thị trường",
      strategies: "Chiến lược",
      discussions: "Thảo luận",
      positions: "Vị thế",
      trade: "Giao dịch",
      exchange: "Trao đổi",
      create: "Tạo"
    },
    common: {
      login: "Đăng nhập",
      logout: "Đăng xuất",
      connected: "Đã kết nối",
      balance: "Số dư",
      claw: 'CLAW',
      points: "điểm",
      loading: "Đang tải...",
      cancel: "Hủy",
      confirm: "Xác nhận",
      submit: "Gửi",
      close: "Đóng",
      back: "Quay lại",
      next: "Tiếp",
      refresh: "Làm mới"
    },
    signals: {
      operations: "Hoạt động",
      noSignals: "Chưa có tín hiệu nào",
      publish: "Xuất bản"
    },
    strategies: {
      title: "Chiến lược",
      market: "Thị trường",
      noStrategies: "Chưa có chiến lược nào",
      publish: "Xuất bản Chiến lược",
      publishSuccess: "Chiến lược đã được xuất bản!",
      submit: "Xuất bản",
      content: "Nội dung Chiến lược",
      symbols: "Các ký hiệu liên quan",
      tags: "Thẻ"
    },
    discussions: {
      title: "Thảo luận",
      market: "Thị trường",
      noDiscussions: "Chưa có thảo luận nào",
      post: "Đăng thảo luận",
      postSuccess: "Thảo luận đã được đăng!",
      submit: "Đăng bài",
      content: "Nội dung thảo luận",
      tags: "Thẻ"
    },
    positions: {
      title: "Vị thế của tôi",
      noPositions: "Chưa có vị thế nào"
    },
    trade: {
      title: "Đặt lệnh",
      market: "Thị trường",
      action: "Hành động",
      symbol: "Ký hiệu",
      price: "Giá",
      quantity: "Số lượng",
      content: "Ghi chú",
      executedAt: "Thời gian giao dịch",
      submit: "Đặt lệnh",
      success: "Đặt lệnh thành công!",
      buy: "Mua",
      sell: "Bán",
      short: "Bán",
      cover: "Che phủ"
    },
    exchange: {
      title: "Đổi điểm",
      currentPoints: "Điểm hiện tại",
      currentCash: "Tiền mặt hiện tại",
      exchangeRate: "Tỷ lệ: 1 điểm = 1.000 USD",
      amount: "Điểm cần đổi",
      submit: "Đổi ngay",
      success: "Đổi thành công!",
      insufficientPoints: "Điểm chưa đủ",
      enterAmount: "Vui lòng nhập số điểm"
    },
    login: {
      title: "Đăng ký / Đăng nhập",
      name: "Tên",
      email: "Email",
      register: "Đăng ký",
      registering: "Đang đăng ký...",
      success: "Đăng nhập thành công!",
      failed: "Đăng nhập thất bại"
    },
    errors: {
      pleaseLogin: "Vui lòng đăng nhập trước",
      operationFailed: "Thao tác thất bại"
    }
  },
  en: {
    nav: {
      signals: 'Marketplace',
      strategies: 'Strategies',
      discussions: 'Discussions',
      positions: 'Positions',
      trade: 'Trade',
      exchange: 'Exchange',
      create: 'Create'
    },
    common: {
      login: 'Login',
      logout: 'Logout',
      connected: 'Connected',
      balance: 'Balance',
      claw: 'CLAW',
      points: 'points',
      loading: 'Loading...',
      cancel: 'Cancel',
      confirm: 'Confirm',
      submit: 'Submit',
      close: 'Close',
      back: 'Back',
      next: 'Next',
      refresh: 'Refresh'
    },
    signals: {
      operations: 'Operations',
      noSignals: 'No signals yet',
      publish: 'Publish'
    },
    strategies: {
      title: 'Strategies',
      market: 'Market',
      noStrategies: 'No strategies yet',
      publish: 'Publish Strategy',
      publishSuccess: 'Strategy published!',
      submit: 'Publish',
      content: 'Strategy Content',
      symbols: 'Related Symbols',
      tags: 'Tags'
    },
    discussions: {
      title: 'Discussions',
      market: 'Market',
      noDiscussions: 'No discussions yet',
      post: 'Post Discussion',
      postSuccess: 'Discussion posted!',
      submit: 'Post',
      content: 'Discussion Content',
      tags: 'Tags'
    },
    positions: {
      title: 'My Positions',
      noPositions: 'No positions yet'
    },
    trade: {
      title: 'Place Order',
      market: 'Market',
      action: 'Action',
      symbol: 'Symbol',
      price: 'Price',
      quantity: 'Quantity',
      content: 'Note',
      executedAt: 'Trade Time',
      submit: 'Submit Order',
      success: 'Order placed successfully!',
      buy: 'Buy',
      sell: 'Sell',
      short: 'Short',
      cover: 'Cover'
    },
    exchange: {
      title: 'Points Exchange',
      currentPoints: 'Current Points',
      currentCash: 'Current Cash',
      exchangeRate: 'Rate: 1 point = 1,000 USD',
      amount: 'Points to Exchange',
      submit: 'Exchange Now',
      success: 'Exchange successful!',
      insufficientPoints: 'Insufficient points',
      enterAmount: 'Please enter points amount'
    },
    login: {
      title: 'Register / Login',
      name: 'Name',
      email: 'Email',
      register: 'Register',
      registering: 'Registering...',
      success: 'Login successful!',
      failed: 'Login failed'
    },
    errors: {
      pleaseLogin: 'Please login first',
      operationFailed: 'Operation failed'
    }
  }
}

// Get translation function
export const getT = (lang: Language): Translations => translations[lang]

// Category translations
export const categoryTranslations: Record<Language, Record<string, string>> = {
  zh: {
    'trading-signal': "Tín hiệu Giao dịch",
    'data-feed': "Dữ liệu Nguồn",
    'model-access': "Truy cập Mô hình",
    'analysis': "Phân tích",
    'tool': "Công cụ",
    'all': "Tất cả Thể loại"
  },
  en: {
    'trading-signal': 'Trading Signal',
    'data-feed': 'Data Feed',
    'model-access': 'Model Access',
    'analysis': 'Analysis',
    'tool': 'Tool',
    'all': 'All Categories'
  }
}
