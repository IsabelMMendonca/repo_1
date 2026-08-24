<template>
  <div style="height:100%;">
    <tool-bar></tool-bar>

    <v-main style="height:100%;">
      <router-view/>
    </v-main>
    <aml-approval-notifier />

    <!-- BUY DIALOG -->
    <BuyDialog
      v-if="showBuyDialog"
      :value="true"
    />

    <v-snackbar
      v-model="snackbar.visible"
      :timeout="snackbar.timeout"
      :color="snackbar.color"
      bottom
    >
      <div class="black--text text-center w-100">
        {{ snackbar.message }}
      </div>
    </v-snackbar>
    
    <request-help-dialog
      :isXSmall="isXSmall"
      :isSmall="isSmall"
      :isMedium="isMedium"
      :isLarge="isLarge"
      :isXLarge="isXLarge"
    >
    </request-help-dialog>
    <!-- footer -->

    <!--confirmation check before login-->
    <the-acknowledged-doc
    @userAction="handleUserAction"
    :tosUserInfo="tosUserInfo"
    :value="showModal"/>
  </div>
</template>

<script>
import RequestHelpDialog from "./../components/common/RequestHelpDialog.vue"
import { useDisplayStore, useAuthStore, useSnackbarStore, useExecutionStore } from "./../store/index"
import { mapState, mapWritableState, mapActions, mapStores } from "pinia"
import ToolBar from "./../components/ToolBar.vue"
import BuyDialog from '@/components/BuyDialog.vue'
import TheAcknowledgedDoc from "@/components/modal/TheAcknowledgedDoc.vue"
import AmlApprovalNotifier from '@/components/operations/AmlApprovalNotifier.vue'

const MARKETS_ALLOWED = new Set([
  'fxmarket',
  'trading',
  'reports'
])

export default {
  components: {
    ToolBar,
    BuyDialog,
    RequestHelpDialog,
    TheAcknowledgedDoc,
    AmlApprovalNotifier
  },
  data () {
    return {
      showModal: false,
      tosUserInfo : {},
      userActivityInterval: null
    }
  },

  beforeDestroy() {
  clearInterval(this.userActivityInterval)

  document.removeEventListener(
    "visibilitychange",
    this.handleVisibilityChange
  )
},
  computed: {
    ...mapWritableState(useAuthStore, [
      "authenticated",
      "userId"
    ]),
    ...mapState(useDisplayStore, [
      "isXSmall",
      "isSmall",
      "isMedium",
      "isLarge",
      "isXLarge"
    ]),
    ...mapStores(useExecutionStore),
    ...mapStores(useAuthStore),
    userRole () {
      const auth = useAuthStore()
      return auth.userRole || localStorage.getItem('userRole')
    },
    showBuyDialog () {
      if (this.userRole !== 'markets') return false

      const name = this.$route.name
      const isUnderGrid = this.$route.path.startsWith('/grid')
      if (!isUnderGrid) return false
      if (name === 'broker') return false
      return !MARKETS_ALLOWED.has(name)
    },
    snackbar () {
      return useSnackbarStore()
    }
  },
  methods: {
    ...mapActions(useAuthStore, {
      getAuthenticated: "getAuthenticated",
      loadAuthenticatedAndUserIdStateFromLocalStorage: "loadAuthenticatedAndUserIdStateFromLocalStorage",
      logout: "logout",
      removeSessionLocalStorage: "removeSessionLocalStorage"
    }),
   async handleUserAction(e)
    {
      if(!e)
      {
         this.logout()
        .then(() => {
          this.authenticated = false
          this.userId = undefined
          this.removeSessionLocalStorage()
          this.$router.push("/")
        })
        .catch((error) => {
          this.$router.push("/login")
          this.snackbar.open(this.$t('extras.logoutError'), 'error')
          console.log(error)
        })
        return;
      }
      else
      {
        try {
          await this.executionStore.acceptUserTOS(this.userId, this.tosUserInfo.cnpj || '')
          this.showModal = false;
        } catch (error) {
          console.error("Error accepting User TOS:", error)
          this.snackbar.open('Error accepting terms of service', 'error')
        }
      }
    },
    recordUserActivity(){
      return this.authStore.updateUserActivity()
      .catch(error => {
        console.debug("Could not update user activity", error)
      })
    },
    handleVisibilityChange(){
       if (document.visibilityState === "visible") {
      this.recordUserActivity()
    }
    },
    setUserHeatBeat(){
          this.recordUserActivity()
          //heartbeat check
          this.userActivityInterval = setInterval(()=>{
            this.recordUserActivity()
          }, 30 * 1000)
          document.addEventListener(
          "visibilitychange",
          this.handleVisibilityChange
        )
    }

  },

  async mounted () {
    const auth = Number(process.env.VUE_APP_AUTH)

    // Always hydrate userId/userRole from localStorage regardless of auth check.
    this.loadAuthenticatedAndUserIdStateFromLocalStorage()
    this.setUserHeatBeat()
    if (auth) {
      try {
        await this.getAuthenticated()

      } catch {
        this.authenticated = false
        this.userId = undefined
        this.removeSessionLocalStorage()
        this.$router.push("/")
        return
      }
    }

    const userEmail = localStorage.getItem('userEmail')
    const userName = localStorage.getItem('userName')

    const isBroker = this.userRole === 'partner' || this.userRole === 'broker'
    let userCnpj = ''
    let entityName = ''

    this.tosUserInfo = {
      role: this.userRole,
      cnpj: '',
      name: userName || '',
      companyName: '',
      email: userEmail || ''
    }

    try {
      // FIXME: We really need /user endpoints for these fields that are common to all entities...
      if (isBroker) {
        const brokerId = localStorage.getItem('brokerId')
        if (brokerId) {
          const res = await this.executionStore.getBrokerById(brokerId)
          if (res && res.data) {
            userCnpj = res.data.cnpj || ''
            entityName = res.data.name || ''
          }
        }
      } else {
        const companyId = localStorage.getItem('companyId')
        if (companyId) {
          const res = await this.executionStore.getCompanyById(companyId)
          if (res && res.data) {
            userCnpj = res.data.cnpj || ''
            entityName = res.data.name || ''
          }
        }
      }
    } catch (err) {
      console.error("Error fetching broker/company info for TOS:", err)
    }

    this.tosUserInfo.cnpj = userCnpj
    this.tosUserInfo.companyName = entityName

    if (this.userId) {
      try {
        const { data } = await this.executionStore.getUserTOS(this.userId)
        const hasAccepted = Boolean(data && data.tos && data.tos.acknowledgedAt)
        this.showModal = !hasAccepted
      } catch (err) {
        console.error("Error fetching user TOS status", err)
      }
    }
  }
}
</script>
