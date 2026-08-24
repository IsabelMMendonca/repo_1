import { defineStore } from "pinia"
import { EventSourcePolyfill } from 'event-source-polyfill'
import axiosInstance from "@/http.js"
const axios = axiosInstance

export {
  INTERACTION_API_BASE_URL,
  INTERACTION_CONSUME_ON_LOAD,
  useInteractionEmailStore,
  useOtpLinkStore
} from "./interactions"

import { useAdminStore } from "./admin"
export { useAdminStore }

export const CLEARFXAI_API_URL = process.env.VUE_APP_CLEARFXAI_API_URL
export const DEVSAFRA_API_URL = process.env.VUE_APP_DEVSAFRA_API_URL
export const APIKEY = process.env.VUE_APP_APIKEY
export const SECRETKEY = process.env.VUE_APP_SECRETKEY
export const APIVERSION = process.env.VUE_APP_API_VERSION
export const APP_PROD = process.env.VUE_APP_PROD

export const API_PATH = `v${APIVERSION}/clearfxai`

export let AUTH_PATH = `apiauth/${API_PATH}`
export let SANDBOX_PATH = `apisandbox/v${APIVERSION}`
export let ALGO_RFQ_PATH = `${SANDBOX_PATH}/algorfq`
export let ENTITY_PATH = `apientity/${API_PATH}`
export let MARKET_PATH = `fxmarket/${API_PATH}`
export let ADMIN_PATH = `apientity/${API_PATH}/admin`
export let RISK_PATH = `risk/${API_PATH}`
export let REPORT_PATH = `report/${API_PATH}`
export let DASHBOARD_PATH = `dashboard/${API_PATH}`
export let MOCK_PRICER_PATH = `mock_pricer/${API_PATH}`
export let PRICER_PATH = `pricer/${API_PATH}`
export let CONSOLE_PATH = `apiconsole/${API_PATH}`
export let MOCK_CONSOLE_PATH = `mock_apiconsole/${API_PATH}`
export let RFQ_PATH = `rfq/${API_PATH}`
export let ORDERLOG_PATH = `orderlog/${API_PATH}`
export let KYC_PATH = `apikyc/${API_PATH}`
export let ZIP_PATH = `exports/${API_PATH}`
export let TLS_PATH = `apitls`
export let MOCK_TLS_PATH = `mockapitls`
export let OPERATION_PATH = `operations/${API_PATH}`
export let QUOTEBOT_PATH = `quotebot/${API_PATH}`

// if (process.env.NODE_ENV === "development") {
// }

export const useColorsStore = defineStore("utils", {
  state: () => ({
    orangeColor: "#FF6D00", // "#FFD600", // "#FB8C00",
    aliveColor: "#00c853",
    yellowTransp: "#4b2000", // "#816c00" // "#633b01"
    aliveTransp: "#003817"
  }),
  actions: {},
});

export const useAuthStore = defineStore("auth", {
  state: () => ({
    authenticated: undefined,
    userId: undefined,
    apiKey: undefined,
    email: undefined,
    userRole: undefined
  }),
  getters: {
    isAuthenticated: (state) => state.authenticated,
    getUserId: (state) => state.userId,
    getUserEmail: (state) => state.email,
    getApiKey: (state) => state.apiKey,
  },
  actions: {
    login (payload) {
      localStorage.setItem("psw", payload.password)
      const url = `${CLEARFXAI_API_URL}/${ENTITY_PATH}/user_lookup/${payload.username}`
      return axios.get(url, {
        headers: {
          Password: payload.password
        }
      })
        .then(response => {
          const data = response.data
          this.userRole = data.role
          this.email = data.email
          this.updateTitle()
          return response
        })
    },
    updateUserActivity(){
      const userId = this.getUserId || localStorage.getItem("userId")

      if (!userId) {
        return Promise.reject(new Error("Missing userId"))
      }

      const url = `${CLEARFXAI_API_URL}/${AUTH_PATH}/user_activity/${encodeURIComponent(userId)}`

      return axios.post(url)
    },
    // not used anywhere:
    // async getAPIKey () {
    //   try {
    //     const url = `${CLEARFXAI_API_URL}/${CONNECTIVITY_PATH}/apikey`
    //     const response = await axios.get(url)
    //     const data = response.data
    //     this.apiKey = data.apikey
    //   } catch (error) {
    //     console.log(error)
    //   }
    // },
    getAuthenticated () {
      this.loadAuthenticatedAndUserIdStateFromLocalStorage()
      const userId = this.getUserId
      const url = `${CLEARFXAI_API_URL}/${AUTH_PATH}/${userId}`
      return axios.get(url)
    },
    logout () {
      const userId = this.getUserId
      const url = `${CLEARFXAI_API_URL}/${AUTH_PATH}/logout/${userId}`
      return axios.delete(url, { headers: { SECRETKEY } })
        .then(() => {
          this.removeSessionLocalStorage()
          this.userRole = undefined
          this.updateTitle()
        });
    },
    loadAuthenticatedAndUserIdStateFromLocalStorage () {
      let userId = localStorage.getItem("userId")
      let userRole = localStorage.getItem("userRole")
      let authenticated = false
      if (userId) {
        authenticated = true
      }
      this.authenticated = authenticated
      this.userId = userId
      this.userRole = userRole
      this.updateTitle()
    },
    updateTitle () {
      const userRole = this.userRole || "Grid"
      if (userRole === "grid") {
        document.title = "ClearfxAI";
      } else if (userRole === "gridpro") {
        document.title = "ClearfxAI | PRO";
      } else if (userRole === "broker") {
        document.title = "ClearfxAI | Broker";
      } else {
        document.title = "ClearfxAI";
      }
    },
    saveSessionLocalStorage (data) {
      localStorage.setItem("userName", data.name)
      localStorage.setItem("userId", data.id)
      localStorage.setItem("userRole", data.role)
      localStorage.setItem("brokerId", data.broker)
      localStorage.setItem("companyId", data.company)
      localStorage.setItem("userEmail", data.email)
      localStorage.setItem("bankId", data.bank)
      this.userRole = data.role
    },
    removeSessionLocalStorage () {
      localStorage.removeItem("userName")
      localStorage.removeItem("userId")
      localStorage.removeItem("userRole")
      localStorage.removeItem("brokerId")
      localStorage.removeItem("companyId")
      localStorage.removeItem("userEmail")
      localStorage.removeItem("apiKey")
      localStorage.removeItem("bankId")
    },
    getUserRoleFromLocalStorage () {
      const data = localStorage.getItem("userRole")
      return data
    },
    // rever método de salvar novo email do usuário para login
    // registerBrokerEmail (email, payload) {
    //   const url = `${CLEARFXAI_API_URL}/${ENTITY_PATH}/user_update/${email}`
    //   return axios.post(url, payload, {
    //       headers: {
    //         SECRETKEY: SECRETKEY
    //       }
    //     })
    // },
    changePasswordUser (new_password) {
      const psw = localStorage.getItem("psw")
      const email = localStorage.getItem("userEmail")
      const data = {
        passwd: new_password
      }
      const url = `${CLEARFXAI_API_URL}/${ENTITY_PATH}/user_update/${email}`
      return axios.put(url, data, {
        headers: {
          SECRETKEY: SECRETKEY,
          Password: psw
        }
      })
    },
    deleteCompanyUser (companyUserEmail) {
      const psw = localStorage.getItem("psw")
      const BrokerUseremail = localStorage.getItem("userEmail")
      const url = `${CLEARFXAI_API_URL}/${ENTITY_PATH}/user_delete?email=${companyUserEmail}&broker_email=${BrokerUseremail}`
      return axios.delete(url, {
        headers: {
          SECRETKEY: SECRETKEY,
          Password: psw
        }
      })
    },
    getUserByBrokerID (broker_id) {
      const url = `${CLEARFXAI_API_URL}/${ENTITY_PATH}/user_lookup_by_broker/${broker_id}`
      return axios.get(url, {
        headers: {
          SECRETKEY: SECRETKEY
        }
      })
    },
  },
});

export const useDisplayStore = defineStore("display", {
  state: () => ({
    breakpoint: undefined,
    windowHeight: window.innerHeight,
    headerHeight: 153,
    // footerHeight: 30,
    marginLayout: 32,
  }),
  getters: {
    isMobile() {
      return this.mobile
    },
    currentBreakpoint () {
      return this.breakpoint
    },
    isXLarge () {
      return this.currentBreakpoint === "xl"
    },
    isLarge () {
      return this.currentBreakpoint === "lg"
    },
    isMedium () {
      return this.currentBreakpoint === "md"
    },
    isSmall () {
      return this.currentBreakpoint === "sm"
    },
    isXSmall () {
      return this.currentBreakpoint === "xs"
    },
    contentHeight () {
      const contentHeight = 
        this.windowHeight 
        - this.headerHeight 
        // - this.footerHeight 
        // - this.marginLayout // x axis
        // - this.marginLayout // y axis
      return `${contentHeight}`
    },
  },
  actions: {
  }
})

export const useAlgoStore = defineStore("algo",  {
  state: () => ({}),
  getters: {},
  actions: {
      newRfq (data) {
      const authStore = useAuthStore()
      const apikey = authStore.getApiKey
      const url = `${CLEARFXAI_API_URL}/${ALGO_RFQ_PATH}/new`
      return axios.post(url, data, {
        headers: {
          APIKEY: apikey
        }
      })
    },
    declineQuoteOrder (rfqid) {
      const authStore = useAuthStore()
      const apikey = authStore.getApiKey
      const url = `${CLEARFXAI_API_URL}/${ALGO_RFQ_PATH}/decline?rfqid=${rfqid}`
      return axios.delete(url, {
        headers: {
          APIKEY: apikey
        }
      })
    },
    getQuote (rfqId) {
      const authStore = useAuthStore()
      const apikey = authStore.getApiKey
      const url = `${CLEARFXAI_API_URL}/${ALGO_RFQ_PATH}/quote/${rfqId}`
      return axios.get(url, {
        headers: {
          APIKEY: apikey
        }
      })
    },
    order (payload) {
      const authStore = useAuthStore()
      const apikey = authStore.getApiKey
      const url = `${CLEARFXAI_API_URL}/${ALGO_RFQ_PATH}/order`
      return axios.post(url, payload, {
        headers: {
          APIKEY: apikey
        }
      })
    },
    async orderList (count) {
      const authStore = useAuthStore()
      await authStore.getAPIKey()
      const apikey = authStore.getApiKey
      const url = `${CLEARFXAI_API_URL}/apisandbox/v1/rfqdb/order/list?count=${count}`
      return axios.get(url, {
        headers: {
          APIKEY: apikey
        }
      })
    },
    quoteOnceRfqOcta (data) {
      const url = `${RFQ_PATH}/quoteonce/${data}`
      return axios.get(url, {
        headers: {
          SECRETKEY: SECRETKEY
        }
      })
    },
  }
})

export const useCalendarStore = defineStore("calendar", {
  state:()=>({
    calendarCountriesFilters: [],
    calendarImportanceFilters:[],
  }),
  getters:{
    getCalendarFilters(){
      return this.calendarCountriesFilters
      },
    },
   actions: {
    setCalendarFilters(filters, type)
    {
      if(type === 'country')
      {
        this.calendarCountriesFilters.includes(filters) ? 
          this.calendarCountriesFilters=this.calendarCountriesFilters.filter(c=>c !== filters) : 
           this.calendarCountriesFilters.push(filters)
      }
      else if(type === 'importance')
      {
        this.calendarImportanceFilters.includes(filters) ? 
          this.calendarImportanceFilters=this.calendarImportanceFilters.filter(c=>c !== filters) : 
           this.calendarImportanceFilters.push(filters)
      }
      
      
    },
    resetCalendarFilter()
    {
      this.calendarCountriesFilters = []
      this.calendarImportanceFilters = []
    }
  }

})
export const useImportFiles = defineStore('importFiles',{
  actions:{
    async downloadFiles(fileType, companyId, name=null, partner)
    {
      const zipUrl = `${CLEARFXAI_API_URL}/${ZIP_PATH}/${fileType}/${companyId}`
      const res = await axios.get(zipUrl,  {
        responseType:"blob",
        headers: {
          "APIKEY": SECRETKEY
        }
      })
      const docTitle = `${partner ? '(PARTNER CLIENT) ': ''}client_${name}_${fileType}_documents.zip`
       const url = window.URL.createObjectURL(res.data)
            const link = document.createElement("a")
            link.href = url
            link.download = docTitle
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)

    }
  }
})

export const MAX_KYC_FILE_SIZE = 8 * 1024 * 1024  // 8 MB in bytes
export const MAX_OPERATION_FILE_SIZE = 8 * 1024 * 1024  // 8 MB in bytes
export const useUploadStore = defineStore('upload', {
  state:() => ({
    files: {docs: [], id: '', rfqId: ''},
    requiredItems: [],
    KYCFiles: {docs: [], id: ''},
  }),
    actions: {
    prepareUpload({ filesList, id, rfqId, maxFiles = 4, maxSize = MAX_OPERATION_FILE_SIZE }) {
      const receivedFiles = Array.from(filesList || []);

      const extraFiles = receivedFiles.length > maxFiles
        ? receivedFiles.slice(maxFiles).map(f => f.name)
        : [];

      const accepted = receivedFiles
        .slice(0, maxFiles)
        .filter(f => f.size <= maxSize);

      const rejectedOversize = receivedFiles
        .slice(0, maxFiles)
        .filter(f => f.size > maxSize)
        .map(f => f.name);

      this.files.docs = accepted;
      this.files.id = id || '';
      this.files.rfqId = rfqId || '';
      this.requiredItems = accepted.map(f => f.name);

      return {
        ok: accepted.length > 0,
        acceptedCount: accepted.length,
        extraFiles,
        rejectedOversize,
      };
    },
    prepareUploadForKYC({ filesList, id, maxFiles=100, minFiles = 0, maxSize = MAX_KYC_FILE_SIZE }) {
      const receivedFiles = Array.from(filesList || []);

      // Files beyond maxFiles are considered extra and will be reported back
      const extraFiles = receivedFiles.length > maxFiles
        ? receivedFiles.slice(maxFiles).map(f => f.name)
        : [];

      // Only validate the first `maxFiles` entries
      const sliceForValidation = receivedFiles.slice(0, maxFiles);

      const accepted = sliceForValidation.filter(f => f.size <= maxSize);

      const rejectedOversize = sliceForValidation
        .filter(f => f.size > maxSize)
        .map(f => f.name);

      const missingCount = Math.max(0, minFiles - receivedFiles.length);

      this.KYCFiles.docs = accepted;
      this.KYCFiles.id = id || '';
      this.requiredItems = accepted.map(f => f.name);

      return {
        ok: accepted.length >= minFiles,
        acceptedCount: accepted.length,
        missingCount,
        extraFiles,
        rejectedOversize,
        maxSizeBytes: maxSize,
        minFiles: minFiles
      };
    },
  },
})
export const useSettingsStore = defineStore("settings", {
  state: () => ({
    isMockDataOn: JSON.parse(localStorage.getItem('isMockDataOn')) ?? false,
    timezone: localStorage.getItem('userTimezone') || 'BRT',
    fontsize: localStorage.getItem('userFontSize') || 'MD',
    spreadType: localStorage.getItem('spreadType') || 'PIPS',
    defaultSettlement: localStorage.getItem('defaultSettlement') || 'd+0',
    defaultTimerForRFQ: Number(localStorage.getItem('defaultTimer')) || 15,
    isModalOn: false,
    vh:window.innerHeight,
  }),
  getters: {
    isUTC: (state) => state.timezone === 'UTC',
    isBRT: (state) => state.timezone === 'BRT',
    getDefaultTimerForRFQ: (state)=>  state.defaultTimerForRFQ * 1000 ,
    getSpreadType: (state) => state.spreadType,
    getFontSize:(state)=>{
      return state.fontsize === 'SM' ? 1 : state.fontsize === 'MD' ? 1.2 : 1.5
    },
    getVh: (state)=> state.vh
  },
  actions: {
    toggleMockData(value) {
      this.isMockDataOn = value
      localStorage.setItem('isMockDataOn', JSON.stringify(value))
    },
    setDefaultSettlement(value) {
      const normalized = { D0: 'd+0', D1: 'd+1', D2: 'd+2' }[value] || String(value).toLowerCase()
      this.defaultSettlement = normalized
      localStorage.setItem('defaultSettlement', normalized)
    },
    formatScreenSize(){
      const screenSize = window.innerWidth;

      if (screenSize <= 900) return "mobile";
      if (screenSize <= 1250) return "tablet";
      if (screenSize <= 1270) return "smallScreen";
      return "full";
    },
    formatFontSize(screenSizeFormat) {
      if (screenSizeFormat === "mobile") {
        return this.getFontSize * "10" + "px";
      } else if (screenSizeFormat === "tablet") {
        return this.getFontSize * "12" + "px";
      } else if (
        screenSizeFormat === "full" ||
        screenSizeFormat === "smallScreen"
      ) {
        return this.getFontSize * "11" + "px";
      }
    },
  formatFileName(name,  isSmallScreen = false){
      const font = this.fontsize

      let maxLength = 0

      if(isSmallScreen){
        if(font === 'LG') maxLength = 55;
        else if(font === 'MD') maxLength = 55;
        else maxLength = 85;
      }
      else
      {
        if(font === 'LG') maxLength = 20;
        else if(font === 'MD') maxLength = 55;
        else maxLength = 120;
      }
      
        return name.length > maxLength ? `${name.slice(0, maxLength)}...`: name;

      //return name.length <= size ? name : name.slice(0,size).trim().concat("...")
    },
    formatCalendarTitle(name){
      const font = this.fontsize
      let maxLength = 0

        if(font === 'LG') maxLength = 20;
        else if(font === 'MD') maxLength = 55;
        else maxLength = 20;
      
        return name.length > maxLength ? `${name.slice(0, maxLength)}...`: name;
    },
    async setDefaultTimerForRFQ(dataTimer) {
      console.debug("Setting default timer for RFQ:", dataTimer.timer, "seconds")
      const res = await useExecutionStore().putBroker({ default_rfq_timer: dataTimer.timer }, dataTimer.id)

      const updatedBrokerTimer = res?.data?.default_rfq_timer
      if (updatedBrokerTimer === undefined) {
        // New field is missing from response;
        // We'll assume it's correctly set since the request still succeeded
        console.warn("Warning: default_rfq_timer not found in response, assuming successful update")
        updatedBrokerTimer = dataTimer.timer
      }

      if (updatedBrokerTimer !== dataTimer.timer) {
        // New setting does not match requested value - Why didn't it update?
        // Server stays authoritative, though, so we still set the values.
        console.warn("Warning: default_rfq_timer in response did not match requested value", {
          expected: dataTimer.timer,
          received: updatedBrokerTimer
        })
      }

      this.defaultTimerForRFQ = updatedBrokerTimer
      localStorage.setItem("defaultTimer", updatedBrokerTimer)
      return this.defaultTimerForRFQ
    },
    setTimezone(tz) {
      const snack = useSnackbarStore()
      this.timezone = tz
      localStorage.setItem('userTimezone', tz)
      snack.open('Saved!', 'green')
    },
    setFontSize(fs){
      const snack = useSnackbarStore()
      this.fontsize = fs
      localStorage.setItem('userFontSize', fs)
      snack.open('Saved!', 'green')
    },
    setSpreadType(type, value)
    {
      const executionStore = useExecutionStore()
      this.spreadType = type
      const brokerId = localStorage.getItem('brokerId')
      localStorage.setItem('spreadType', type)
      let spreadBps = .5
      let spreadPips = 50
      if (type === 'PIPS' && value !== undefined && value !== null) {
        spreadPips = value
      }
      if (type === 'BPS' && value !== undefined && value !== null) {
        spreadBps = value
      }
      executionStore.putBroker({'spread': spreadPips, 'spread_bps':spreadBps, 'spread_type' : this.getSpreadType}, brokerId)
    },
    setViewHeight(vh)
    {
      this.vh = vh
    },
  }
})

export const useRiskStore = defineStore('risk', {
  state: () => ({
    settingsStore: useSettingsStore(),
    maturities: [],
    shouldRefreshMaturities: false
  }),
  getters: {
    formattedMaturities(state) {
      return state.maturities.map(item => {
        const amount = Number(item.Amount)

        return {
          ...item,
          formattedDate: (() => {
            const [year, month, day] = item.Date.split('-')
            return `${day}/${month}/${year}`
          })(),
          receivable: amount > 0 ? amount : '-',
          payable: amount < 0 ? Math.abs(amount) : '-'
        }
      })
    }
  },
  actions: {
    getMaturities () {
      const url = this.settingsStore.isMockDataOn
        ? '/assets/cashFlowData.json'
        : `${CLEARFXAI_API_URL}/${RISK_PATH}/csv/data`
      return axios.get(url, {
        headers: {
          "APIKEY": SECRETKEY
        }
      })
    },
    getExposureData (exposure) {
      const url = exposure
        ? '/assets/cashFlowData.json'
        : '/assets/hedgeUSD.json'
      return axios.get(url)
        .then(response => {
          const data = response.data
          return data
        })
        .catch((error) => {
          console.log(error)
        })
    },
    setShouldRefreshMaturities(value) {
      this.shouldRefreshMaturities = value
    },
    refreshMaturities () {
      return this.getMaturities()
        .then((response) => {
          const data = response.data
          this.maturities = data.data
    
          if (!this.settingsStore.isMockDataOn) {
            localStorage.setItem('lastRealMaturities', JSON.stringify(this.maturities))
          }
        })
    },
    saveMaturities (data) {
      const file = data.file
      const url = this.settingsStore.isMockDataOn
        ? `${CLEARFXAI_API_URL}/${SANDBOX_PATH}/csv/import`
        : `${CLEARFXAI_API_URL}/${RISK_PATH}/csv/import`
      const bodyFormData = new FormData();
      bodyFormData.append("file", file);
      return axios.post(url, bodyFormData, {
        headers: {
          "APIKEY": SECRETKEY
        }
      })
    },
    downloadMaturities () {
      const url = this.settingsStore.isMockDataOn
        ? `${CLEARFXAI_API_URL}/${SANDBOX_PATH}/csv/export`
        : `${CLEARFXAI_API_URL}/${RISK_PATH}/csv/export`
      return axios.get(url, {
        headers: {
          "APIKEY": SECRETKEY
        },
        responseType: "arraybuffer"
      })
    },
    setMaturitiesFromStorage(data) {
      this.maturities = data
    }
  },
})

export const useExecutionStore = defineStore("execution", {
  state: () => ({
    settingsStore: useSettingsStore(),
    wasFileUploaded: false,
    selectedId: null,
  }),
  getters:{
    getSelectedId: (state) => state.selectedId,
  },
  actions: {
    setSelectedId(id){
      this.selectedId = id
    },
    getDemoModeFlag () {
      const url = `${CLEARFXAI_API_URL}/${DASHBOARD_PATH}/demo_mode_flag`
      return axios.get(url, {
        headers: {
          SECRETKEY: SECRETKEY
        }
      })
    },
    getBrokerStats (broker_cnpj) {
      const url = `${CLEARFXAI_API_URL}/${DASHBOARD_PATH}/broker_stats?broker_cnpj=${broker_cnpj}`

      return axios.get(url, {
        headers: {
          SECRETKEY: SECRETKEY
        }
      })
    },
    getCompanyStats (brokerCnpj) {
      // Computed Company stats (transactedVolume/revenue/lastTrade), keyed by company id.
      // Pass a broker CNPJ to scope values and companies to their portfolio.
      const query = brokerCnpj ? `?broker_cnpj=${brokerCnpj}` : ''
      const url = `${CLEARFXAI_API_URL}/${DASHBOARD_PATH}/company_stats${query}`

      return axios.get(url, {
        headers: {
          SECRETKEY: SECRETKEY
        }
      })
    },
    getActivePositions () {
      const url = this.settingsStore.isMockDataOn
       ? `${CLEARFXAI_API_URL}/${SANDBOX_PATH}/active_positions`
       : `${CLEARFXAI_API_URL}/${DASHBOARD_PATH}/active_positions`

      return axios.get(url, {
        headers: {
          SECRETKEY: SECRETKEY
        }
      })
    },
     async formatDefaultTimer(id){
       const broker = await this.getBrokerById(id)
       return broker.data.default_rfq_timer * 1000;

    },
    // not used
    // getLiveRates () {
    //   const url = this.settingsStore.isMockDataOn
    //    ? `${CLEARFXAI_API_URL}/${SANDBOX_PATH}/live_rates`
    //    : `${CLEARFXAI_API_URL}/${DASHBOARD_PATH}/live_rates`

    //   return axios.get(url, {
    //     headers: {
    //       SECRETKEY: SECRETKEY
    //     }
    //   })
    // },
    getTotalTransactedVolume () {
      const url = this.settingsStore.isMockDataOn
       ? `${CLEARFXAI_API_URL}/${SANDBOX_PATH}/total_transacted_volume`
       : `${CLEARFXAI_API_URL}/${DASHBOARD_PATH}/total_transacted_volume`

      return axios.get(url, {
        headers: {
          SECRETKEY: SECRETKEY
        }
      })
    },
    getDailyAverageVolume () {
      const url = this.settingsStore.isMockDataOn
        ? `${CLEARFXAI_API_URL}/${SANDBOX_PATH}/daily_average_volume`
        : `${CLEARFXAI_API_URL}/${DASHBOARD_PATH}/daily_average_volume`

      return axios.get(url, {
        headers: {
          SECRETKEY: SECRETKEY
        }
      })
    },
    getMonthlyRevenue () {
      const url = this.settingsStore.isMockDataOn
        ? `${CLEARFXAI_API_URL}/${SANDBOX_PATH}/monthly_revenue`
        : `${CLEARFXAI_API_URL}/${DASHBOARD_PATH}/monthly_revenue`

      return axios.get(url, {
        headers: {
          SECRETKEY: SECRETKEY
        }
      })
    },
    getCompaniesByBrokerId (brokerId) {
      const url = `${CLEARFXAI_API_URL}/${ENTITY_PATH}/broker_companies_by_id/${brokerId}`

      return axios.get(url, {
        headers: {
          SECRETKEY: SECRETKEY
        }
      })
    },
    getCompaniesByBankId (bankId) {
      const url = `${CLEARFXAI_API_URL}/${ENTITY_PATH}/bank_companies_by_id/${bankId}`

      return axios.get(url, {
        headers: {
          SECRETKEY: SECRETKEY
        }
      })
    },
    createCompany (data) {
      data.cnpj = data.cnpj.replace(/\D/g, '')
      const url = `${CLEARFXAI_API_URL}/${ENTITY_PATH}/company_create`

      return axios.post(url, data, {
        headers: {
          SECRETKEY: SECRETKEY
        }
      })
    },
      convertCurrencyToNumber (currencyString) {
      if (typeof currencyString === 'string') {
        return parseFloat(currencyString.replace(/[^0-9.-]+/g,""));
      } else {
        return 0.00
      }
    },
    convertOperationVolumeToNumber(currencyString) {
  if (typeof currencyString !== 'string') {
    return 0.00
  }

  return parseFloat(
    currencyString
      .replace('R$', '')
      .trim()
      .replace(/\./g, '')  // remove thousand separator
      .replace(',', '.')   // convert decimal separator
  )
},
    async fetchBankEmails(list) {
      const adminStore = useAdminStore()
      const { data } = await adminStore.getBankList();
      const bankList = data;
      let bankEmails = []

      for (const li of list) {
        const bankIfo = bankList.find(b => b.id === li.id) || null
        if (bankIfo?.email) {
          bankEmails.push(bankIfo)
        }
      }

      return bankEmails
    },
   async fetchCompaniesBankListEmails(clientId){
      const rest = await this.getCompanyById(clientId)
      const list = rest.data.banklist
      return this.fetchBankEmails(list);
      
    },
    transformBrokerCompaniesToClients(list = []) {
      return list.map(item => {
        const bankArray = Array.isArray(item.banklist)
          ? item.banklist
              .filter(b => b && (b.name))
              .map(b => ({
                name: b.name,
                limit: Number(b.limit) || 0,
                id: b.id
              }))
          : []
        const user = item.user || {}
        return {
          id: item.id || "",
          broker_id: item.broker || "",
          companyName: item.name || "",
          cnpj: item.cnpj || "",
          banklist: bankArray,
          status: item.blocked === 1 ? "Paused" : "Active",
          email: user.email || "",
          transactedVolume: item.transactedVolume || 0,
          revenue: item.revenue || 0,
          lastTrade: item.lastTrade,
          timecreate: item.timecreate,
          phone: "",
          companyRepresentative: user.name || ""
        }
      })
    },
    updateClients (isMockDataOn, clients, brokerId = "00") {
      localStorage.setItem('clients', JSON.stringify(clients))
        if (isMockDataOn) {
          // for demo mode use brokerid = 00
          this.saveBrokerClients(clients, "00")
            .catch(error => {
              console.log(error)
            })
          return
        }
        this.saveBrokerClients(clients, brokerId)
          .catch(error => {
            console.log(error)
          })
    },
    putCompany (data) {
      const url = `${CLEARFXAI_API_URL}/${ENTITY_PATH}/company_update/${data.id}`

      return axios.put(url, data, {
        headers: {
          SECRETKEY: SECRETKEY
        }
      })
    },
    deleteCompany (id) {
      const url = `${CLEARFXAI_API_URL}/${ENTITY_PATH}/company_delete/${id}`

      return axios.delete(url, {
        headers: {
          SECRETKEY: SECRETKEY
        }
      })
    },
    deleteCompanyByFlag(id) {
      const url = `${CLEARFXAI_API_URL}/${ENTITY_PATH}/company_update/${id}`

      return axios.put(url,{deleted : 1},{
        headers:{SECRETKEY:SECRETKEY}
      })
    },
    getCompanyById (id) {
      const url = `${CLEARFXAI_API_URL}/${ENTITY_PATH}/company_lookup_by_id/${id}`
      return axios.get(url, {
        headers: {
          SECRETKEY: SECRETKEY
        }
      })
    },
    getUserTOS (userId) {
      const url = `${CLEARFXAI_API_URL}/${ENTITY_PATH}/user_tos/${userId}`
      return axios.get(url)
    },
    acceptUserTOS (userId, userCnpj) {
      const url = `${CLEARFXAI_API_URL}/${ENTITY_PATH}/user_tos_accept/${userId}`
      return axios.post(url, {
        userCnpj,
        documents: 'terms',
        version: 'v1'
      })
    },
    getCompanyByCnpj (cnpj) {
      const url = `${CLEARFXAI_API_URL}/${ENTITY_PATH}/company_lookup/${cnpj}`

      return axios.get(url, {
        headers: {
          SECRETKEY: SECRETKEY
        }
      })
    },
    putBroker (data, id) {
      const url = `${CLEARFXAI_API_URL}/${ENTITY_PATH}/broker_update/${id}`

      return axios.put(url, data, {
        headers: {
          SECRETKEY: SECRETKEY
        }
      })
    },
    async getMasterBrokerEmail(masterId){
      const adminStore = useAdminStore()
      const response = await adminStore.getBrokerList()
      const brokers = response.data

      const parent = brokers.find(b=>b.id === masterId)
      return parent.email
    },
    getBrokerById (id) {
      const url = `${CLEARFXAI_API_URL}/${ENTITY_PATH}/broker_lookup_by_id/${id}`

      return axios.get(url, {
        headers: {
          SECRETKEY: SECRETKEY
        }
      })
    },
    getBrokerByCnpj (cnpj) {
      const url = `${CLEARFXAI_API_URL}/${ENTITY_PATH}/broker_lookup/${cnpj}`

      return axios.get(url, {
        headers: {
          SECRETKEY: SECRETKEY
        }
      })
    },
    uploadBrokerLogo(brokerId, file) {
      const url = `${CLEARFXAI_API_URL}/${ENTITY_PATH}/broker_logo/${brokerId}`

      const formData = new FormData()
      formData.append("file", file)

      return axios.put(url, formData, {
        headers: {
          SECRETKEY,
          "Content-Type": "multipart/form-data"
        }
      })
    },
    getBrokerLogo(brokerId) {
      const url = `${CLEARFXAI_API_URL}/${ENTITY_PATH}/broker_logo/${brokerId}`

      return axios.get(url, {
        headers: { SECRETKEY: SECRETKEY },
        responseType: "blob"
      })
    },
    getBankById (id) {
      const url = `${CLEARFXAI_API_URL}/${ENTITY_PATH}/bank_lookup_by_id/${id}`

      return axios.get(url, {
        headers: {
          SECRETKEY: SECRETKEY
        }
      })
    },
    async updateBankOverride(bankId, overrideMode){
      await this.putBankById(bankId, {
        is_override: overrideMode
      })
    },
    putBankById(id, override)
    {
      const url = `${CLEARFXAI_API_URL}/${ENTITY_PATH}/bank_update/${id}`
      return axios.put(url, override, {
        headers:{
          SECRETKEY: SECRETKEY
        }
      })
    },
    saveScheduledQuote (quote) {
      const url = `${CLEARFXAI_API_URL}/${SANDBOX_PATH}/save-scheduled-quotes`

      return axios.post(url, quote, {
        headers: {
          SECRETKEY: SECRETKEY
        }
      })
    },
    overwriteScheduledQuotes (quotes) {
      const url = `${CLEARFXAI_API_URL}/${SANDBOX_PATH}/overwrite-scheduled-quotes`

      return axios.post(url, quotes, {
        headers: {
          SECRETKEY: SECRETKEY
        }
      })
    },
    getScheduledQuotes () {
      const url = `${CLEARFXAI_API_URL}/${SANDBOX_PATH}/get-scheduled-quotes`

      return axios.get(url, {
        headers: {
          SECRETKEY: SECRETKEY
        }
      })
    },
    putQuoteManual(rfqId, quoteManual, bankId) {
      const url = `${CLEARFXAI_API_URL}/${RFQ_PATH}/quote_manual/${rfqId}`

      const params = {
        bank_id: bankId,
        ...(quoteManual != null && { quote_manual: quoteManual })
      }

      return axios.put(url, null, {
        headers: { SECRETKEY },
        params
      })
    },
    getRfqsManualPrice(brokerId) {
      const url = `${CLEARFXAI_API_URL}/${RFQ_PATH}/rfqs_update_price/${brokerId}`

      return axios.get(url, {
        headers: { SECRETKEY: SECRETKEY }
      })
    },
    requestQuote(data, selectedBanks = [], selectedBanksIds = []) {
      const bankId = selectedBanksIds
      const banksParam = selectedBanks.length
        ? `?banks=${selectedBanks.map(name => name.replace(/\s+/g, '').toLowerCase()).join(",")}`
        : ""

      const url = this.settingsStore.isMockDataOn
        ? `${CLEARFXAI_API_URL}/${SANDBOX_PATH}/mock-request-quote${banksParam}`
        : `${CLEARFXAI_API_URL}/${RFQ_PATH}/new?banksId=${bankId}`

      return axios.post(url, data, {
        headers: {
          SECRETKEY: SECRETKEY
        }
      })
    },
    getQuoteFeed(
      rfqId,
      selectedBanks = [],
      selectedBanksIds = [],
      onQuote,
      onError,
      heartbeatTimeoutMs = null
    ) {
      const banks = selectedBanks.map(name =>
        name.replace(/\s+/g, '').toLowerCase()
      )
      const bankId = selectedBanksIds.map(id=>id)

      const query = this.settingsStore.isMockDataOn
        ? `?banks=${banks.join(",")}`
        : `?banksId=${bankId}`

      const url = this.settingsStore.isMockDataOn
        ? `${CLEARFXAI_API_URL}/${SANDBOX_PATH}/mock-quotefeed-${rfqId}${query}`
        : `${CLEARFXAI_API_URL}/${RFQ_PATH}/quotefeed/${rfqId}${query}`

      const options = {
        headers: {
          SECRETKEY: SECRETKEY
        }
      }

      if (Number.isFinite(heartbeatTimeoutMs) && heartbeatTimeoutMs > 0) {
        options.heartbeatTimeout = Math.floor(heartbeatTimeoutMs)
      }

      const eventSource = new EventSourcePolyfill(url, options)

      eventSource.addEventListener('QUOTE_EVENT', event => {
        const data = JSON.parse(event.data)
        onQuote(data)
      })

      eventSource.onerror = error => {
        eventSource.close()
        onError(error)
      }

      return eventSource
    },
    makeQuoteOrder(data) {
      const url = this.settingsStore.isMockDataOn
        ? `${CLEARFXAI_API_URL}/${SANDBOX_PATH}/mock-quote-order-${data.rfq_id}`
        : `${CLEARFXAI_API_URL}/${RFQ_PATH}/neworder/${data.rfq_id}`

      return axios.post(url, data, {
        headers: {
          SECRETKEY: SECRETKEY
        }
      })
    },
    cancelQuote(data) {
      const url = this.settingsStore.isMockDataOn
        ? `${CLEARFXAI_API_URL}/${SANDBOX_PATH}/mock-cancel-quote-${data.rfq_id}`
        : `${CLEARFXAI_API_URL}/${RFQ_PATH}/cancel/${data.rfq_id}`

      return axios.post(url, data, {
        headers: {
          SECRETKEY: SECRETKEY
        }
      })
    },
    getIntradayOrderList(brokerCnpj, companyCnpj) {
      const url = `${CLEARFXAI_API_URL}/${ORDERLOG_PATH}/intraday`

      // always send broker_cnpj, only send company_cnpj if provided
      const params = { broker_cnpj: brokerCnpj }
      if (companyCnpj) params.company_cnpj = companyCnpj

      return axios.get(url, {
        headers: { SECRETKEY: SECRETKEY },
        params
      })
    },
    async reconcilePricing(data)
    {
      return await this.updateRfqReconcilePrice(data.rfq_id, data)
    },
    //reconciliation rfq
    updateRfqReconcilePrice(rfqId, payload){
      const url =`${CLEARFXAI_API_URL}/${ORDERLOG_PATH}/${rfqId}/reconcile`
      // Only rfq_id, rfq_px (the new corrected client rate), and user_email are
      // sent to the backend - nothing else from payload should leak into the request body.
      const body = {
        rfq_id: rfqId,
        rfq_px: payload?.rfq_px,
        user_email: payload?.user_email,
      }
      return axios.put(url, body, {
        headers: {
          SECRETKEY,
        }
      })
    },
    getRfqDocument(rfq_id, doctype) {
      const base = this.settingsStore.isMockDataOn
        ? `${CLEARFXAI_API_URL}/${SANDBOX_PATH}`
        : `${CLEARFXAI_API_URL}/${RFQ_PATH}`

      const url = `${base}/documents/${rfq_id}/${doctype}`

      return axios.get(url, {
        headers: { SECRETKEY: SECRETKEY },
        responseType: "blob"  // IMPORTANT: receives file correctly (PDF, CSV, PPTX, etc.)
      })
    },
    uploadRfqDocument(rfq_id, doctype, file) {
      const url = this.settingsStore.isMockDataOn
        ? `${CLEARFXAI_API_URL}/${SANDBOX_PATH}/documents/${rfq_id}?doctype=${doctype}`
        : `${CLEARFXAI_API_URL}/${RFQ_PATH}/documents/${rfq_id}?doctype=${doctype}`

      const formData = new FormData()
      formData.append("file", file)
      const arr = JSON.parse(localStorage.getItem('fileId')) || []
      arr.push(rfq_id)
      localStorage.setItem('fileId', JSON.stringify(arr))
      
      return axios.put(url, formData, {
        headers: {
          SECRETKEY,
          "Content-Type": "multipart/form-data"
        }
      })
    },
    getRfqListWithDocument() {
      const url = this.settingsStore.isMockDataOn
        ? `${CLEARFXAI_API_URL}/${SANDBOX_PATH}/documents/rfqs`
        : `${CLEARFXAI_API_URL}/${RFQ_PATH}/documents/rfqs`

      return axios.get(url, {
        headers: { SECRETKEY: SECRETKEY }
      })
    },
    deleteOperation(operation_id) {
      const base = this.settingsStore.isMockDataOn
        ? `${CLEARFXAI_API_URL}/${SANDBOX_PATH}`
        : `${CLEARFXAI_API_URL}/${OPERATION_PATH}`

      const url = `${base}/${operation_id}`

      return axios.delete(url, {
        headers: { SECRETKEY }
      })
    },
    async downloadOperation(operationIds) {
      const doctypes = [
        "invoice",
        "import_declaration",
        "proof_of_import",
        "bill_of_lading"
      ]

      if (!operationIds.length || !doctypes.length) return

      for (const operationId of operationIds) {
        for (const doctype of doctypes) {
          try {
            const response = await this.getOperation(operationId, doctype)

            const filename = `${operationId}_${doctype}.pdf`

            const url = window.URL.createObjectURL(response.data)
            const link = document.createElement("a")
            link.href = url
            link.download = filename
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)

          } catch (err) {
            console.log(err)
          }
        }
      }
    },
    getOperation(operation_id, doctype) {
      const base = this.settingsStore.isMockDataOn
        ? `${CLEARFXAI_API_URL}/${SANDBOX_PATH}`
        : `${CLEARFXAI_API_URL}/${OPERATION_PATH}`

      const url = `${base}/${operation_id}/${doctype}`

      return axios.get(url, {
        headers: { SECRETKEY: SECRETKEY },
        responseType: "blob"  // IMPORTANT: receives file correctly (PDF, CSV, PPTX, etc.)
      })
    },
    getAmlCheck(operationId){
        const url = `${CLEARFXAI_API_URL}/${OPERATION_PATH}/get_aml_check/${operationId}`
        
        return axios.get(url, {
        headers: {
          SECRETKEY
        }
      })
    },
    updateAmlCheck(operationId, wasChecked){
       const url = `${CLEARFXAI_API_URL}/${OPERATION_PATH}/update_aml_check/${operationId}`

       return axios.put(url, null, {
        headers: {
          SECRETKEY,
          "Content-Type": "multipart/form-data"
        },
          params : {
          was_checked : wasChecked
        }
      })
    },
    ///get_kyc_id_by_company_id/{company_id}",
    getKYCIdByCompanyId(company_id) {
      const url = `${CLEARFXAI_API_URL}/${KYC_PATH}/get_kyc_id_by_company_id/${company_id}`

      return axios.get(url, {
        headers: { SECRETKEY: SECRETKEY },
      })
    },
    getKYC(kyc_id, doctype) {
      const url = `${CLEARFXAI_API_URL}/${KYC_PATH}/kyc/${kyc_id}/${doctype}`

      return axios.get(url, {
        headers: { SECRETKEY: SECRETKEY },
        responseType: "blob"  // IMPORTANT: receives file correctly (PDF, CSV, PPTX, etc.)
      })
    },
    async downloadKYC(kycIds) {
      const doctypes = [
          "a",
          "d",
          "c",
          "e",
          "f",
          "g",
          "h",
          "i",
          "j",
          "k",
          "ls",
          "m",
          "n",
          "o",
      ]

      if (!kycIds.length || !doctypes.length) return

      for (const kycId of kycIds) {
        for (const doctype of doctypes) {
          try {
            const response = await this.getOperation(kycId, doctype)

            const filename = `${kycId}_${doctype}.pdf`

            const url = window.URL.createObjectURL(response.data)
            const link = document.createElement("a")
            link.href = url
            link.download = filename
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)

          } catch (err) {
            console.log(err)
          }
        }
      }
    },
    updateKYC(file, company_id, broker_id, kyc_id=null){
        const params = new URLSearchParams({
        broker_id,
        company_id,
      })
      if (kyc_id) {
        params.append("kyc_id", kyc_id)
      }
      const url = `${CLEARFXAI_API_URL}/${KYC_PATH}/kycs?${params.toString()}`
      const formData = new FormData()
      formData.append("file", file)
      return axios.put(url, formData, {
        headers: {
          SECRETKEY,
          "Content-Type": "multipart/form-data"
        }
      })
    },
    uploadOperation(alias, doctype, file, amlCheck, operation_id = null, client_id = null, operation_type = null, volume_brl= null) {
      const broker_id = localStorage.getItem('brokerId')
      let company_id = localStorage.getItem('companyId')
      if(client_id){
        company_id = client_id
      }

      const basePath = this.settingsStore.isMockDataOn
        ? SANDBOX_PATH
        : OPERATION_PATH

      const params = new URLSearchParams({
        alias,
        broker_id,
        operation_type,
        aml_check : amlCheck,
        doctype,
        // volume_brl: Number(volume_brl)
      })

      if (operation_id) {
        params.append("operation_id", operation_id)
      }

      if (company_id && company_id !== 'null') {
        params.append("company_id", company_id)
      }


      const url = `${CLEARFXAI_API_URL}/${basePath}/operations-upload?${params.toString()}`

      const formData = new FormData()
      formData.append("file", file)
      return axios.put(url, formData, {
        headers: {
          SECRETKEY,
          "Content-Type": "multipart/form-data"
        }
      })
    },
    getOperationIdList() {
      const broker_id = localStorage.getItem('brokerId')
      const company_id = localStorage.getItem('companyId')

      const basePath = this.settingsStore.isMockDataOn
        ? SANDBOX_PATH
        : OPERATION_PATH

      const params = new URLSearchParams({
        broker_id
      })

      if (company_id && company_id !== 'null') {
        params.append("company_id", company_id)
      }

      const url = `${CLEARFXAI_API_URL}/${basePath}/intraday?${params.toString()}`

      return axios.get(url, {
        headers: {
          SECRETKEY
        }
      })
    },
    putOperationWithRfq (rfq_id, operation_id) {
      const url = `${CLEARFXAI_API_URL}/${OPERATION_PATH}/operations_rfq`

      return axios.put(url, null, {
        headers: { SECRETKEY: SECRETKEY },
        params: {
          rfq_id: rfq_id,
          operation_id: operation_id
        }
      })
    },
    getMockIntradayOrderList(data) {
      const url = `${CLEARFXAI_API_URL}/${SANDBOX_PATH}/mock-intraday-order-list`

      return axios.get(url, {
        headers: {
          SECRETKEY: SECRETKEY
        },
        params: data
      })
    },
    getMockBanks () {
      const url = this.settingsStore.isMockDataOn
        ? `${CLEARFXAI_API_URL}/${SANDBOX_PATH}/mock-banks`
        : ''
      return axios.get(url, {
        headers: {
          SECRETKEY: SECRETKEY
        }
      })
    },
    getBrokerClients (brokerId) {
      const url = `${CLEARFXAI_API_URL}/${SANDBOX_PATH}/get-clients`
      return axios.get(url, {
        headers: {
          SECRETKEY: SECRETKEY
        },
        params: {
          mockOn: this.settingsStore.isMockDataOn,
          broker_id: brokerId
        }
      })
    },
    saveBrokerClients (clients, brokerId) {
      const url = `${CLEARFXAI_API_URL}/${SANDBOX_PATH}/save-clients`
      return axios.post(url, {
        clients: clients
      }, {
        headers: {
          SECRETKEY: SECRETKEY
        },
        params: {
          mockOn: this.settingsStore.isMockDataOn,
          broker_id: brokerId
        }
      })
    },

    sendEmail({ type, brokerEmail, clientEmail, quoteData, mailCase }) {
      let endpoint = ''

      if (type === 'scheduled') {
        endpoint = 'send-scheduled-quote'
      } else if (type === 'approval') {
        endpoint = 'send-quote-approval-request'
      } else if (type === 'login') {
        endpoint = 'send-login-credentials'
      } else {
        endpoint = 'send-quote-confirmation'
      }


      const url = `${CLEARFXAI_API_URL}/${SANDBOX_PATH}/${endpoint}`

      const body = {
        broker_email: brokerEmail,
        client_email: clientEmail,
        quote_data: quoteData
      }

      if (endpoint === 'send-quote-confirmation') {
        body.case = mailCase
      }

      return axios.post(url, body, {
        headers: { SECRETKEY: SECRETKEY }
      })
    },
    saveReports (data) {
      const url = this.settingsStore.isMockDataOn
       ? `${CLEARFXAI_API_URL}/${SANDBOX_PATH}/save-reports`
       : `${CLEARFXAI_API_URL}/${REPORT_PATH}/save-reports`
      return axios.post(url, data, {
        headers: {
          SECRETKEY: SECRETKEY
        }
      })
    },
    getReports (sourceMockedOff, sourceMockedOn) {
      const url = this.settingsStore.isMockDataOn
       ? `${CLEARFXAI_API_URL}/${SANDBOX_PATH}/get-reports`
       : `${CLEARFXAI_API_URL}/${REPORT_PATH}/get-reports`
      return axios.get(url, {
        headers: {
          SECRETKEY: SECRETKEY
        },
        params: this.settingsStore.isMockDataOn
        ? {source: sourceMockedOn}
        : sourceMockedOff
      })
    },
    getRfqReports ({ broker_id, date_min, date_max, company_id } = {}) {
      const params = { broker_id, date_min, date_max }
      if (company_id) params.company_id = company_id
      return axios.get(`${CLEARFXAI_API_URL}/${REPORT_PATH}/get-rfq-reports`, {
        headers: { SECRETKEY },
        params,
      })
    },
    getOperationReports ({ broker_id, date_min, date_max, company_id } = {}) {
      const params = { broker_id, date_min, date_max }
      if (company_id) params.company_id = company_id
      return axios.get(`${CLEARFXAI_API_URL}/${REPORT_PATH}/get-operation-reports`, {
        headers: { SECRETKEY },
        params,
      })
    },
//disable rfq_quote when toggling button
    toggleClientStatusBackEnd(companyId, blocked)
    {
      const url = `${CLEARFXAI_API_URL}/${ENTITY_PATH}/company_update/${companyId}`


      //updates blocked from DB when user toggles pressed button
      return axios.put(url,{blocked:blocked},{
        headers:{SECRETKEY:SECRETKEY}
      }).then().catch(err=>{throw err})
    }
  }
})

export const useSnackbarStore = defineStore('snackbar', {
  state: () => ({
    visible: false,
    message: '',
    color: 'success',
    timeout: 3000
  }),
  actions: {
    open (message, color = 'success', timeout = 3000) {
      this.message = message
      this.color = color
      this.timeout = timeout
      this.visible = true
    },
    close () {
      this.visible = false
    }
  }
})

export const useAutopricerStore = defineStore("autopricer", {
  state: () => ({
    settingsStore: useSettingsStore()
  }),
  actions: {
    getMarketData (bankId) {
      const url = this.settingsStore.isMockDataOn
        ? `${CLEARFXAI_API_URL}/${MOCK_PRICER_PATH}/autopricer-marketdata`
        : `${CLEARFXAI_API_URL}/${PRICER_PATH}/autopricer-marketdata?bankId=${bankId}`
      return axios.get(url)
    },
    putCasado (side, field, value, bankId) {
      const url = this.settingsStore.isMockDataOn
        ? `${CLEARFXAI_API_URL}/${MOCK_PRICER_PATH}/autopricer-casado`
        : `${CLEARFXAI_API_URL}/${PRICER_PATH}/autopricer-casado?bankId=${bankId}`
      return axios.put(url, { side, field, value }, {
      })
    },
    getDealEmailAddress () {
      const url = this.settingsStore.isMockDataOn
        ? `${CLEARFXAI_API_URL}/${MOCK_PRICER_PATH}/deal-email-address`
        : `${CLEARFXAI_API_URL}/${PRICER_PATH}/get-deal-email-address`
      return axios.get(url)
    },
    putDealEmailAddress (payload) {
      const url = this.settingsStore.isMockDataOn
        ? `${CLEARFXAI_API_URL}/${MOCK_PRICER_PATH}/deal-email-address`
        : `${CLEARFXAI_API_URL}/${PRICER_PATH}/put-deal-email-address`
      return axios.put(url, payload)
    },
    getDealCount (bankId) {
      const url = this.settingsStore.isMockDataOn
        ? `${CLEARFXAI_API_URL}/${MOCK_PRICER_PATH}/dealcount`
        : `${CLEARFXAI_API_URL}/${PRICER_PATH}/get-deal-count?bankId=${bankId}`
      return axios.get(url)
    },
    getSpreadsCategory () {
      const url = this.settingsStore.isMockDataOn
        ? `${CLEARFXAI_API_URL}/${MOCK_PRICER_PATH}/spreads-category`
        : `${CLEARFXAI_API_URL}/${PRICER_PATH}/get-spreads-category`
      return axios.get(url)
    },
    putSpreadsCategory (payload) {
      const url = this.settingsStore.isMockDataOn
        ? `${CLEARFXAI_API_URL}/${MOCK_PRICER_PATH}/spreads-category`
        : `${CLEARFXAI_API_URL}/${PRICER_PATH}/put-spreads-category`
      return axios.put(url, payload)
    },
    getSpreadsNotional () {
      const url = this.settingsStore.isMockDataOn
        ? `${CLEARFXAI_API_URL}/${MOCK_PRICER_PATH}/spreads-notional`
        : `${CLEARFXAI_API_URL}/${PRICER_PATH}/get-spreads-notional`
      return axios.get(url)
    },
    putSpreadsNotional (payload) {
      const url = this.settingsStore.isMockDataOn
        ? `${CLEARFXAI_API_URL}/${MOCK_PRICER_PATH}/spreads-notional`
        : `${CLEARFXAI_API_URL}/${PRICER_PATH}/put-spreads-notional`
      return axios.put(url, payload)
    },
    getRfqs (bankId) {
      const url = this.settingsStore.isMockDataOn
        ? `${CLEARFXAI_API_URL}/${MOCK_PRICER_PATH}/rfqs`
        : `${CLEARFXAI_API_URL}/${PRICER_PATH}/get-rfqs?bankId=${bankId}`
      return axios.get(url)
    },
  }
})

export const useConsoleApiStore = defineStore("consoleApi", {
  state: () => ({
    settingsStore: useSettingsStore(),
    requestCount: 0,
    alerts: {},
    apiKey: "",
  }),
  actions: {
    async fetchRequestCount () {
      try {   
        const url = this.settingsStore.isMockDataOn
          ? `${CLEARFXAI_API_URL}/${MOCK_CONSOLE_PATH}/mock-request-count`
          : `${CLEARFXAI_API_URL}/${CONSOLE_PATH}/mock-request-count`
        const response = await axios.get(url)
        this.requestCount = response.data.requests_count
      } catch (error) {
        console.log(error)
      }
    },

    async fetchAlerts () {
      try {
        const url = this.settingsStore.isMockDataOn
          ? `${CLEARFXAI_API_URL}/${MOCK_CONSOLE_PATH}/mock-liquidity-providers-alerts`
          : `${CLEARFXAI_API_URL}/${CONSOLE_PATH}/mock-liquidity-providers-alerts`
        const response = await axios.get(url)
        this.alerts = response.data
      } catch (error) {
        console.log(error)
      }
    },

    async fetchApiKey () {
      try {
        const url = this.settingsStore.isMockDataOn
          ? `${CLEARFXAI_API_URL}/${MOCK_CONSOLE_PATH}/apikey`
          : `${CLEARFXAI_API_URL}/${CONSOLE_PATH}/apikey`
        const response = await axios.get(url)
        this.apiKey = response.data.apikey
      } catch (error) {
        console.error(error)
      }
    },

    async refreshApiKey (currentApiKey) {
      try {
        const url = this.settingsStore.isMockDataOn
          ? `${CLEARFXAI_API_URL}/${MOCK_CONSOLE_PATH}/apikey-refresh?currentapikey=${currentApiKey}`
          : `${CLEARFXAI_API_URL}/${CONSOLE_PATH}/apikey-refresh?currentapikey=${currentApiKey}`
        const response = await axios.put(url)
        this.apiKey = response.data.apikey
      } catch (error) {
        console.error(error)
      }
    },
  }
})

export const useTlsStore = defineStore("tls", {
  state: () => ({
    settingsStore: useSettingsStore(),
    tlsList: []
  }),
  getters: {
    // tlsListGetter(state) {
    //   const tlsList = state.tlsList
    //   const tlsListLength = tlsList.length
    //   for (let i=0; i < tlsListLength; i++) {
    //     tlsList[i] = JSON.parse(tlsList[i])
    //   }
    //   return tlsList
    // }
  },
  actions: {
    async getTLSList (active=1) {
      try {
        const url = this.settingsStore.isMockDataOn
          ? `${CLEARFXAI_API_URL}/${MOCK_TLS_PATH}/list`
          : `${CLEARFXAI_API_URL}/${TLS_PATH}/list`
        const response = await axios.get(url, {
          headers: { "APIKEY": APIKEY },
          params: {
            active: active
          },
        })
        const data = response.data
        const jsonData = JSON.parse(JSON.stringify(data))
        let tlsList = []
        if (jsonData.content !== "") {
          tlsList = JSON.parse(jsonData.content.replaceAll("'", ""))
        }
        this.tlsList = tlsList
      } catch (error) {
        console.log(error)
      } 
    },
    downloadTLS (tlsId) {
      const url = this.settingsStore.isMockDataOn
        ? `${CLEARFXAI_API_URL}/${MOCK_TLS_PATH}/get`
        : `${CLEARFXAI_API_URL}/${TLS_PATH}/get`
      return axios.get(url, {
        headers: { "APIKEY": APIKEY },
        params: {
          hash_code: tlsId
        },
        responseType: "arraybuffer"
      })
    }
  },
})

export const useBillingStore = defineStore("billing", {
  state: () => ({
    billingData: {
      monthlyRevenueThisMonth: 0,
      monthlyRevenueLastMonth: 0,
      lastMonthPaid: false,
      invoices: []
    },
    partners: [],
    loading: false
  }),
  actions: {
    async fetchBillingStats(brokerCnpj) {
      this.loading = true
      try {
        const url = `${CLEARFXAI_API_URL}/${DASHBOARD_PATH}/billing_stats?broker_cnpj=${brokerCnpj}`
        const response = await axios.get(url, {
          headers: {
            SECRETKEY: SECRETKEY
          }
        })
        this.billingData = response.data
        return response.data
      } catch (error) {
        console.error("Failed to fetch billing stats:", error)
        throw error
      } finally {
        this.loading = false
      }
    },
    async updateInvoicePaid(invoiceId, paid) {
      try {
        const url = `${CLEARFXAI_API_URL}/${DASHBOARD_PATH}/update_invoice_paid`
        const response = await axios.post(url, {
          invoice_id: invoiceId,
          paid: paid
        }, {
          headers: {
            SECRETKEY: SECRETKEY
          }
        })
        return response.data
      } catch (error) {
        console.error("Failed to update invoice status:", error)
        throw error
      }
    },
    async fetchBillingStatsAllPartners(brokerCnpj) {
      this.loading = true
      try {
        const url = `${CLEARFXAI_API_URL}/${DASHBOARD_PATH}/billing_stats_all_partners?broker_cnpj=${brokerCnpj}`
        const response = await axios.get(url, {
          headers: { SECRETKEY: SECRETKEY }
        })
        if (response.data && response.data.partners) {
          this.partners = response.data.partners
        }
        this.billingData = response.data
        return response.data
      } catch (error) {
        console.error("Failed to fetch aggregate billing stats:", error)
        throw error
      } finally {
        this.loading = false
      }
    },
    async fetchBillingStatsForPartner(brokerCnpj, partnerCnpj) {
      this.loading = true
      try {
        const url = `${CLEARFXAI_API_URL}/${DASHBOARD_PATH}/billing_stats_for_partner?broker_cnpj=${brokerCnpj}&partner_cnpj=${partnerCnpj}`
        const response = await axios.get(url, {
          headers: { SECRETKEY: SECRETKEY }
        })
        this.billingData = response.data
        return response.data
      } catch (error) {
        console.error("Failed to fetch partner billing stats:", error)
        throw error
      } finally {
        this.loading = false
      }
    }
  }
})
