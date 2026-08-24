import VueRouter from "vue-router"

import LandingView from "./../views/LandingView.vue"
import LoginView from "./../views/LoginView.vue"
import InteractionLinkView from "./../views/InteractionLinkView.vue"
import AuthenticatedLayout from "./../layouts/AuthenticatedLayout.vue"
import NotFoundView from './../views/NotFoundView.vue'

import MarketsView from '../views/MarketsView.vue'

import CashFlowView from "./../views/CashFlowView.vue"
import ExposureView from "./../views/ExposureView.vue"
import DataView from '../views/DataView.vue'
import VerticesCharts from './../components/curves/VerticesCharts.vue'
import CurvesCharts from './../components/curves/CurvesCharts.vue'
import MarketData from '../components/curves/MarketData.vue'
import ForwardCurves from '../components/curves/ForwardCurves.vue'
import PricerData from '../components/curves/PricerData.vue'
import QuoteApproval from "@/components/QuoteApproval.vue"

import BrokerView from './../views/BrokerView.vue'
import TradingView from "./../views/TradingView.vue"
import ReportsView from '../views/ReportsView.vue'
import ConsoleView from './../views/ConsoleView.vue'
import SetupView from './../views/SetupView.vue'

import EngineView from './../views/EngineView.vue'
import BlotterView from "./../views/BlotterView.vue"

import { useAuthStore } from "./../store/index"
import PricerClients from "@/views/PricerClients.vue"
import OperationView from "@/views/OperationView.vue"

import ManagementView from "@/views/ManagementView.vue"
import BillingView from "@/views/BillingView.vue"
import UserManualView from "@/views/UserManualView.vue"


const auth = Number(process.env.VUE_APP_AUTH)

/* ===== Role rules (only markets, pro, broker) ===== */
const ALLOWED_BY_ROLE = {
  broker: new Set(['broker', 'fxmarket', 'reports', 'operation-reports', 'management', 'trading', 'operations', 'billing' ]),
  markets: new Set(['fxmarket']),
  //admin: new Set(['management']),
  pricer: new Set(['engine', 'blotter', "clients"]),
  partner: new Set(['partner','fxmarket', 'reports', 'operation-reports', 'trading', 'operations', 'billing', 'user-guide' ]),
  console: new Set(['console'])
}
const BLACKLIST_BY_ROLE = {
  pro: new Set(['broker'])
}

function canAccessRoute (routeName, role) {
  if (!role) return false
  const name = routeName || ''

  if (role === 'broker') return ALLOWED_BY_ROLE.broker.has(name)
  if (role === 'markets') return name === 'fxmarket'
 // if(role === 'admin') return ALLOWED_BY_ROLE.admin.has(name)
  if (role === 'pro') return !BLACKLIST_BY_ROLE.pro.has(name)
  if (role === 'pricer') return ALLOWED_BY_ROLE.pricer.has(name)
  if (role === 'partner') return ALLOWED_BY_ROLE.partner.has(name)
  if (role === 'console') return name === 'console'

  return false
}

function firstAllowedPathForRole (role) {
  if (role === 'partner') return '/grid/partner'
  if (role === 'broker') return '/grid/broker'
  if (role === 'markets') return '/grid/fxmarket'
  if (role === 'pro') return '/grid/fxmarket'
  if (role === 'pricer') return '/grid/engine'
  //if (role === 'admin') return '/grid/management'
  if (role === 'console') return '/grid/console'
  return '/login'
}

function resolveRole (authStore) {
  return authStore.userRole || localStorage.getItem('userRole')
}
/* ================================================ */

const routes = [
  { 
    path: "/", 
    name: "landing",
    component: LandingView,
    meta: {
      public: true,
      logoutOnly: true
    },
  },
  {
    path: "/login",
    name: "login",
    component: LoginView,
    meta: {
      public: true,
      logoutOnly: true
    },
  },
  {
    path: "/approve/:token?",
    name: "approval-link",
    component: InteractionLinkView,
    meta: {
      public: true
    },
  },
  {
    path: "/grid",
    component: AuthenticatedLayout,
    meta: {
      public: false
    },
    children: [
      {
        path: "fxmarket",
        name: "fxmarket",
        component: MarketsView,
      },
      {
        path:'management',
        name:'management',
        component: ManagementView
      },
      {
        path:'billing',
        name:'billing',
        component: BillingView
      },
      {
        path:'user-guide',
        name:'user-guide',
        component: UserManualView
      },
      {
        path: "data",
        name: "data",
        component: DataView,
        children: [
          {
            path: "vertices",
            name: "vertices",
            component: VerticesCharts,
          },
          {
            path: "curves",
            name: "curves",
            component: CurvesCharts,
          },
          {
            path: "market-data",
            name: "market-data",
            component: MarketData,
          },
          {
            path: "forward-curves",
            name: "forward-curves",
            component: ForwardCurves,
          },
          {
            path: "pricer",
            name: "pricer",
            component: PricerData,
          },
        ]
      },
      {
        path: "broker",
        name: "broker",
        component: BrokerView,
      },
      {
        path: "partner",
        name: "partner",
        component: BrokerView,
      },
      {
        path: "quote-approval",
        name: "quote-approval",
        component: QuoteApproval,
      },
      {
        path: "cashflow",
        name: "cashflow",
        component: CashFlowView,
      },
      {
        path: "exposure",
        name: "exposure",
        component: ExposureView,
      },
      {
        path: "trading",
        name: "trading",
        component: TradingView,
      },
       {
        path: "operations",
        name: "operations",
        component: OperationView,
      },
      {
        path: "reports",
        name: "reports",
        component: ReportsView,
      },
      {
        path: "operation-reports",
        name: "operation-reports",
        component: ReportsView,
      },
      {
        path: "console",
        name: "console",
        component: ConsoleView,
      },
      {
        path: "setup",
        name: "setup",
        component: SetupView,
      },
      {
        path: "engine",
        name: "engine",
        component: EngineView,
      },
      {
        path: "blotter",
        name: "blotter",
        component: BlotterView,
      },
      {
        path:"clients",
        name:"clients",
        component:PricerClients,
      }
    ]
  },
  {
    path: '*',
    name: 'NotFound',
    component: NotFoundView
  }
]

const router = new VueRouter({
  mode: "history",
  base: process.env.BASE_URL,
  routes
})

function handleRedirect (to, next, isPublicRoute, authenticated, role) {
  if (!isPublicRoute && !authenticated) {
    return next({
      path: '/login',
      query: {
        redirect: to.fullPath
      }
    })
  }
  const onlyLoggedOutRoute = to.matched.some(record => record.meta.logoutOnly)
  if (authenticated && onlyLoggedOutRoute) return next(firstAllowedPathForRole(role))
  return next()
}

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  let authenticated = authStore.isAuthenticated
  const isPublicRoute = to.matched.some(record => record.meta.public)

  if (auth === 0) {
    if (!isPublicRoute) {
      const role = resolveRole(authStore)
      const targetName = to.name || '';
      if (!targetName && to.path === '/grid') { return next(firstAllowedPathForRole(role))}
      if (!canAccessRoute(targetName, role)){  return next(firstAllowedPathForRole(role)) }
      
    }
    
    return next()
  }

  if (authenticated === undefined) {
    authStore.loadAuthenticatedAndUserIdStateFromLocalStorage()
    authenticated = authStore.isAuthenticated
    if (!isPublicRoute) {
      if (authenticated) {
        const role = resolveRole(authStore)
        const targetName = to.name
        if (!canAccessRoute(targetName, role)) return next(firstAllowedPathForRole(role))
        return handleRedirect(to, next, isPublicRoute, authenticated, role)
      }
      return next({
        path: "/login",
        query: {
          redirect: to.fullPath
        }
      })
    }
  }

  if (!isPublicRoute) {
    const role = resolveRole(authStore)
    const targetName = to.name
   
    if (!targetName && to.path === '/grid') return next(firstAllowedPathForRole(role))
    if (!canAccessRoute(targetName, role)) return next(firstAllowedPathForRole(role))
  }

  const role = resolveRole(authStore)
  return handleRedirect(to, next, isPublicRoute, authenticated, role)
})

// router.afterEach((to, from) => {
  // store.commit("setCurrentRouteName", to.name)
  // store.commit("setToolbarTitle", to.meta.pageTitle)
  // store.commit("setPreviousPage", from.path)
  // store.commit("setMaxHeightCurrentRoute", to.meta.maxHeight)
  // store.commit("setBackgroundColor", to.meta.backgroundColor)
  // resize.onResize()
// })

export default router
