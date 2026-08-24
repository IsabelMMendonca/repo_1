<template>
  <v-app-bar
    app
    class="app-bar-responsive"
    :height="heightToolBar"
    color="black"
  >
    <div
      style="width: 100%;"
      class="d-flex flex-column fill-height"
    >
    <!-- USER NAME, COMPANY & TIMEZONE -->
      <div class="d-flex text-caption text--disabled font-weight-regular">
      <div v-if="!isBroker && !isPartner">
        {{ userInfo.companyRepresentative }} | {{ userInfo.companyName }}
      </div>
      <div v-if="isBroker || isPartner">
        {{ brokerInfo.representative }} | {{ brokerInfo.name }}
      </div>
      <v-spacer></v-spacer>
        {{ $t('toolbar.timeZone') }}: {{ timezone }}
      </div>

      <div class="my-auto d-flex" style="justify-content: space-between; overflow: auto hidden">

        <!-- CLEARFXAI LOGO || PRX LOGO (se partner) -->
        <div class="d-flex pr-4 align-center" style="min-height: 64px">
          <v-img
            v-if="!isPartner && !isClientPartner && !isBroker && !isPro"
            aspect-ratio="16/9"
            height="40"
            :src="require(`./../assets/clearfxai-logo.png`)"
            max-width="150"
            min-width="150"
            contain
          >
          </v-img>

          <v-img
            v-if="isPartner || isClientPartner || isBroker || isPro"
            aspect-ratio="16/9"
            height="50"
            :src="handleLogo"
            max-width="150"
            min-width="150"
            contain
          >
          </v-img>
   
          <v-divider inset vertical class="mx-4" style="height: 100%"></v-divider>
  
        <!-- USER ROLE -->
          <div 
            class="mt-2 font-weight-light text--secondary"
            :style="{
              fontSize:  'clamp(18px, 2vw, 26px)',
              backgroundColor: roleBackgroundColor,
              padding: isBroker || isPricer || isPartner ? '4px 8px' : '',
            }"
          >
            {{ getRole }}
          </div>
        </div>

        <!-- TICKERS CAROUSEL -->
        <div class="ticker-wrapper">
            <div
              ref="ticker"
              class="ticker-track"
              :style="{ animationDuration: `${animationDuration}s` }"
            >
              <div
                class="ticker-item"
                v-for="([ticker, tickerValue], index) in duplicatedFxMarketIntradayList"
                :key="`${ticker}-${index}`"
              >
                <TickersCarousel
                  :tickersData="tickerValue"
                  :ticker="ticker"
                  style="min-width: 200px"
                />
              </div>
            </div>
          </div>
          <v-divider class="px-2" inset vertical></v-divider>

          <!-- ECONOMIC CALENDAR -->
          <div class="px-2" style="max-width: 400px;flex: 1 1 0;">
            <EconomicCalendar/>
          </div>

          <v-divider inset vertical></v-divider>

          <!-- NEWS CAROUSEL -->
          <div class="px-2" style="max-width: 500px; flex: 1 1 0; cursor: pointer;" v-ripple>
            <NewsCarousel/>
          </div>

          <v-divider inset vertical></v-divider>

          <!-- AVG PTAX -->
          <div class="px-2">
            <AvgPtax/>
          </div>

        <!-- USER LOGOUT -->
        <v-menu
          open-on-hover
          bottom
          offset-y
        >
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              class="my-auto ml-5"
              v-bind="attrs"
              v-on="on"
              icon
            >
              <v-icon>
                mdi-account
              </v-icon>
            </v-btn>
          </template>

          <v-list>
              <v-list-item v-if="isBroker" @click="$router.push('management')">
              <v-list-item-title>
                {{ $t('instructions.management') }}
              </v-list-item-title>
            </v-list-item>
            <v-list-item v-show="isPartner || isBroker" link @click="linkToBilling()">
              <v-list-item-title>
                {{ $t('instructions.billingAndRevenue') }}
              </v-list-item-title>
            </v-list-item>
            <v-list-item v-show="isPartner" link @click="linkToGuide()">
              <v-list-item-title>
                {{ $t('instructions.userManual') }}
              </v-list-item-title>
            </v-list-item>
            <v-list-item @click="showSettingsDialog = true">
              <v-list-item-title>
                {{ $t('toolbar.settings.title') }}
              </v-list-item-title>
            </v-list-item>
            <v-list-item link @click="logoutClicked()">
              <v-list-item-title>
                {{ $t('instructions.logout') }}
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </div>

    <!-- MENUS -->
     <template v-slot:extension>
      <menu-list-tool-bar 
      :menu-list-with-flags="menuListWithFlags"
      :menu-states="menuStates"
      :show-demo-mode="showDemoMode"
      :is-markets="isMarkets"
      @close-all-groups="closeAllGroups"
      />
    </template>

    <!-- USER SETTINGS -->
    <the-settings-tool-bar
    v-model="showSettingsDialog"
    :is-partner="isPartner"
    :is-broker="isBroker"
    :is-pro="isPro"
    :is-banklist-saved="isBanklistSaved"
    :loading-password="loadingPassword"
    :is-pt-b-r-locale="isPtBRLocale"
    :new-password="newPassword"
    :user-info="userInfo"
    :selected-count="selectedCount"
    :spread-type-settings="spreadTypeSettings"
    :font-size-settings="fontSizeSettings"
    :default-time-settings="defaultTimeSettings"
    :default-settlement-settings="defaultSettlement"
    :selected-file="selectedFile"
    :broker-info="brokerInfo"
    :timezone-local="timezoneLocal"
    :loading-url="loadingUrl"
    :banklist="banklist"
    :selected-url="selectedUrl"
    :settings-headers-broker="settingsHeadersBroker"
    @set-font-size="setFontSize"
    @set-default-timer-for-rfq="setDefaultTimerForRFQ"
    @set-default-settlement="saveDefaultSettlement"
    @set-spread-type="setSpreadType"
    @set-timezone="setTimezone"
    @save-password="savePassword"
    @save-logo="saveLogo"
    @save-banklist="saveBanklist"
    @handle-image="handleImage"
    @save-url="saveUrl"
    />
</v-app-bar>
</template>

<script>
import { mapState, mapWritableState, mapActions } from "pinia"
import { useFxMarketStore } from "@/store/toolbarStore"
import { useAuthStore, useSettingsStore, useExecutionStore, useSnackbarStore, useAdminStore } from "./../store/index"
import TickersCarousel from "./TickersCarousel.vue"
import EconomicCalendar from "./../components/EconomicCalendar.vue"
import NewsCarousel from "./../components/NewsCarousel.vue"
import AvgPtax from "./../components/AvgPtax.vue"
import BuyDialog from '@/components/BuyDialog.vue'
import * as utils from "./../utils.js"
import TheSettingsToolBar from "./toolbar/TheSettingsToolBar.vue"
import MenuListToolBar from "./toolbar/MenuListToolBar.vue"

export default {
  components: {
    TickersCarousel,
    EconomicCalendar,
    NewsCarousel,
    AvgPtax,
    BuyDialog,
    TheSettingsToolBar,
    MenuListToolBar
  },
  inject:['changeLanguageFn'],
  data () {
    return {
      logo: null,
      logoMasterPartner: null,
      logoError: false,
      selectedFile:{
        file: null,
        name: "",
        wasUploaded: false,
      },
      selectedUrl: "https://foobar.clearfxai.com/",
      loadingUrl: false,
      brokerId: null,
      showDemoMode: false,
      newPassword: undefined,
      loadingPassword: false,
      banklist: [],
      originalBanklist: [],
      isBanklistSaved: true,
      tab: 0,
      intervalMinutely: null,
      intervalHourly: null,
      openGroups: {},
      hasFetchedHourlySuccess: false,
      animationDuration: 20,
      menuStates: {},
      showSettingsDialog: false,
      masterPartner: null,
      settingsHeadersClient: [
        { text: "", value: "selected", align: "center", sortable: false, width: "10%" },
        { text: this.$t('toolbar.settings.headers.limit'), value: "limit", align: "center", sortable: false, width: "30%" },
        { text: this.$t('toolbar.settings.headers.bank'), value: "name", align: "center", sortable: false, width: "30%" },
        { text: this.$t('toolbar.settings.headers.connection'), value: "status", align: "center", sortable: false, width: "30%" }
      ],
      settingsHeadersBroker: [
        { text: this.$t('toolbar.settings.headers.bank'), value: "name", align: "center", sortable: false, width: "30%" },
        { text: this.$t('toolbar.settings.headers.connection'), value: "status", align: "center", sortable: false, width: "30%" },
        { text: this.$t('toolbar.settings.headers.apikey'), value: "apikey", align: "center", sortable: false, width: "30%" },
        { text: '', value: "connection", align: "center", sortable: false, width: "10%"},
      ],
      timezoneLocal: useSettingsStore().timezone,
      fontSizeSettings: useSettingsStore().fontsize,
      spreadTypeSettings: useSettingsStore().spreadType,
      width: window.innerWidth,
      brokerInfo: {
        name: "",
        phone: "",
        representative: "",
        email: "",
      },
        partnerInfo: {
        name: "",
        phone: "",
        representative: "",
        email: "",
      },
      originalBrokerInfo: null,
      isBrokerInfoSaved: true,
      userInfo: {
        companyName: '',
        companyRepresentative: '',
        email: '',
        phone: '',
        cnpj: '',
        region: ''
      },
      originalUserInfo: null,
      isUserInfoSaved: true,
      showEditDialog: false,
      editForm: {
        companyName: '',
        companyRepresentative: '',
        email: '',
        phone: '',
        cnpj: '',
        region: ''
      },
      brokerId: null,
      companyId: null,
      isClientPartnerFlag: false,
    }
  },
  async mounted ()  {
    this.getDemoModeFlag()
      .then(response => {
        const value = response.data.demo_mode_flag
        this.showDemoMode = value === 1
      })
      .catch(error => {
        console.log(error)
      })

    const mockData = localStorage.getItem('isMockDataOn')
    if (mockData === "true") {
      this.isMockDataOn = mockData
    }

    this.checkLastFetchHourlyAndUpdate()

    this.intervalHourly = setInterval(() => {
      if (!this.hasFetchedHourlySuccess) {
        this.checkLastFetchHourlyAndUpdate()
      }
    }, 10 * 60 * 1000)

    this.fetchMinutelyAndUpdate()
    this.startSmoothScroll()

    if (this.isBroker || this.isPartner) {
          const brokerId = localStorage.getItem('brokerId')
          this.brokerId = brokerId
          await this.fetchBanksById(brokerId);
          await this.updateViaBroker(brokerId)
          this.checkIsClientPartner(brokerId)
    } else {
        if (this.isPro) {
          this.brokerId = localStorage.getItem('brokerId')
        }
        this.companyId = localStorage.getItem('companyId')
        this.bankId = localStorage.getItem('bankId')
        this.fetchClientInfo()
    }
    if (this.isPro) this.fetchMockBanks()
  },
  watch: {
    brokerId: {
      immediate: true,
       async handler(newVal) {
           await this.checkIsClientPartner(newVal)
          await  this.loadBrokerLogo(newVal)
    }
    },
     masterPartner(newVal) {
        if (!this.isPartner) return
        if (!newVal || newVal === '0') return

        this.loadBrokerLogo(this.brokerId)
    },
    brokerInfo: {
      handler (val) {
        this.isBrokerInfoSaved = JSON.stringify(val) === JSON.stringify(this.originalBrokerInfo)
      },
      deep: true
    },
    userInfo: {
      handler (val) {
        this.isUserInfoSaved = JSON.stringify(val) === JSON.stringify(this.originalUserInfo)
      },
      deep: true
    },
    banklist: {
      handler (val) {
        this.isBanklistSaved =
          JSON.stringify(val) === JSON.stringify(this.originalBanklist)
      },
      deep: true
    }
  },
  beforeDestroy () {
    if (this.logo) {
      URL.revokeObjectURL(this.logo)
    }
    clearInterval(this.intervalMinutely)
    clearInterval(this.intervalHourly)
    clearInterval(this.intervalId)
  },
  methods: {
    handleImage(e){
      const file = e.target.files[0]; //saving image
      if(!file) return
      this.selectedFile.file = file
      this.selectedFile.name = file.name;
      this.selectedFile.wasUploaded = true;
      

    },
    ...mapActions(useAuthStore, [
      "changePasswordUser",
      "logout",
      "removeSessionLocalStorage",
      "getUserRoleFromLocalStorage",
      "registerBrokerEmail"
    ]),
    ...mapActions(useExecutionStore, [
      'putBroker',
      'getBrokerLogo',
      'uploadBrokerLogo',
      'getDemoModeFlag',
      'getBrokerById',
      'getMockBanks',
      'getBrokerClients',
      'getCompanyById',
      'getBankById',
      "putBankById",
      'putCompany',
      'saveBrokerClients',
      'setImgToDB',
    ]),
    ...mapActions(useAdminStore, [
      'getBankIdList'
    ]),
    ...mapActions(useFxMarketStore, [
      "getBrokerMarketdata",
      "getFxMarketDataMinutely",
      "getYesterdayTimeZone",
      "getFxMarketDataHourly",
      "fetchFxMarketDataHourly",
      "fetchFxMarketDataMinutely",
      "checkLastFetchHourlyAndUpdate",
      "fetchMinutelyAndUpdate"
    ]),
    ...mapActions(useSettingsStore, [
      "toggleMockData",
      'setTimezone',
      "setFontSize",
      "setSpreadType",
      "setDefaultSettlement"
    ]),
    resetSelectedFile () {
      this.selectedFile = {
        file: null,
        name: "",
        wasUploaded: false,
      }
    },
    async loadBrokerLogo(brokerId) {
      if (!brokerId) return
        if(this.logo) URL.revokeObjectURL(this.logo)
        if(this.logoMasterPartner) URL.revokeObjectURL(this.logoMasterPartner)

        this.logo = null
        this.logoMasterPartner = null
        this.logoError = false
        const [masterRes, brokerRes] = await Promise.allSettled([
          this.logoIdCheck ? this.getBrokerLogo(this.logoIdCheck) : null,
          this.getBrokerLogo(brokerId)
        ])
        if(masterRes.status === 'fulfilled' && masterRes.value?.data)
        {
          this.logoMasterPartner = URL.createObjectURL(masterRes.value.data)
        }
        if(brokerRes.status === 'fulfilled' && brokerRes.value?.data)
        {
          this.logo = URL.createObjectURL(brokerRes.value.data)
        }
    },
    saveLogo () {
      if (!this.selectedFile.wasUploaded) {
        this.snackbar.open(this.$t('toolbar.settings.partnerInfo.logoPutError'), 'warning')
        return
      }

      const brokerId = localStorage.getItem('brokerId')
      this.uploadBrokerLogo(
        brokerId,
        this.selectedFile.file
      )
        .then(() => {
          this.snackbar.open(this.$t('toolbar.settings.partnerInfo.logoSaved'), 'success')
          setTimeout(() => { window.location.reload() }, 1000)
        })
        .catch((error) => {
          console.log(error)
          this.snackbar.open(this.$t('toolbar.settings.partnerInfo.logoPutError'), 'warning')
        })
        .finally(() => {
          this.resetSelectedFile()
        })
    },
    async saveUrl() {
      try {
        this.loadingUrl = true

        const brokerId = localStorage.getItem('brokerId')

        await this.putBroker({'whitelabelurl': this.selectedUrl}, brokerId)

        this.snackbar.open(this.$t('toolbar.settings.partnerInfo.copyUrl'), 'success')
        setTimeout(() => { window.location.reload() }, 1000)
      } catch (error) {
        console.log(error)
        this.snackbar.open(this.$t('toolbar.settings.partnerInfo.urlPutError'), 'warning')
      } finally {
        this.loadingUrl = false
      }
    },

    async updateViaBroker(brokerId) {
      try {
        const response = await this.getBrokerById(brokerId)
        const broker = response.data
        const spread_type = broker?.spread_type ?? 'PIPS'
        let spread_value = broker?.spread_bps
        if (spread_type === 'PIPS') {
          spread_value = broker?.spread
        }
        this.setSpreadType(spread_type, spread_value)
      } 
      catch (error) {
        console.log(error)
      }
    },
    async fetchBanksById(brokerId) 
    {
      try {
      const response = await this.getBrokerById(brokerId)
      const r = await this.getBankIdList()
      const bankList = r.data
      const whitelabelurl = response.data?.whitelabelurl
      if(whitelabelurl) {
        this.selectedUrl = whitelabelurl
      }
      const banks = await Promise.all(
        response.data.banklist.map(async b => {
          let overrideMode = null
          if (bankList.includes(b.id)) {
            try {
              const res = await this.getBankById(b.id)
              const data = res.data
              overrideMode = data?.is_override ?? 'bankauto'
            } catch (error) {
              console.log(error)
            }
          }
          return {
            name: b.name,
            id:  b.id,
            cnpj: b.cnpj,
            timeDue:b.timeDue,
            email: b?.email,
            overrideMode: overrideMode
          }
        })
      )
      const userName = localStorage.getItem('userName')
      const brokerEmail = localStorage.getItem('userEmail')
      const brokerUserInfo = {
            name: response.data.name,
            cnpj: response.data.cnpj,
            representative: userName,
            email: brokerEmail
          }
      this.brokerInfo = brokerUserInfo
      localStorage.setItem('brokerUserInfo', JSON.stringify(brokerUserInfo))
      
      this.banklist = banks

      } catch (error) {
        console.log(error)
      }
    },
    savePassword () {
      this.loadingPassword = true
      const psw = md5(this.newPassword.trim())
      this.changePasswordUser(psw)
        .then(() => {
          this.newPassword = undefined
          localStorage.setItem('psw', psw)

          this.snackbar.open(this.$t('toolbar.savedPassword'), 'success')
        })
        .catch((error) => {
          console.log(error)

          this.snackbar.open(this.$t('toolbar.errorPassword'), 'warning')
        })
        .finally(() => {
          this.loadingPassword = false
        })
    },
    async setDefaultTimerForRFQ(dataTimer) {
      try {
        const updatedTimer = await useSettingsStore().setDefaultTimerForRFQ(dataTimer)
        console.debug("Default RFQ time successfully updated to:", updatedTimer, "seconds")
        this.snackbar.open(this.$t("toolbar.settings.selectTimerUpdateSuccess"), "green")
      } catch (error) {
        console.error("Error saving default RFQ time:", error)
        this.snackbar.open(this.$t("toolbar.settings.selectTimerUpdateError"), "red")
      }
    },
    saveDefaultSettlement(value) {
      this.setDefaultSettlement(value)
      this.snackbar.open(
        this.$t('toolbar.settings.selectSettlementUpdateSuccess'),
        'green'
      )
    },
    // saveBrokerContactInfo () {
    //   localStorage.setItem('brokerInfo', JSON.stringify(this.brokerInfo))
    //   this.originalBrokerInfo = JSON.parse(JSON.stringify(this.brokerInfo))
    //   this.isBrokerInfoSaved = true
    //   const user_id = localStorage.getItem('userId')
    //   const email = this.brokerInfo.email
    // },
    // Comment method for now
    // saveUserContactInfo () {
    //   localStorage.setItem('userInfo', JSON.stringify(this.editForm))

    //   this.userInfo = { ...this.editForm }

    //   if (this.client) {
    //     this.client.companyName = this.userInfo.companyName || ''
    //     this.client.companyRepresentative = this.userInfo.companyRepresentative || ''
    //     this.client.email = this.userInfo.email || ''
    //     this.client.phone = this.userInfo.phone || ''
    //     this.client.cnpj = this.userInfo.cnpj || ''
    //     this.client.region = this.userInfo.region || ''
    //   }

    //   const finalize = () => {
    //     this.originalUserInfo = JSON.parse(JSON.stringify(this.userInfo))
    //     this.isUserInfoSaved = true
    //     this.showEditDialog = false
    //   }

    //   if (this.client && this.companyId && this.brokerId) {
    //     this.getBrokerClients(this.brokerId)
    //       .then(response => {
    //         const clients = response.data.clients || []
    //         const updatedClients = clients.map(c =>
    //           c.id === this.companyId ? this.client : c
    //         )
    //         return this.saveBrokerClients(updatedClients, this.brokerId)
    //       })
    //       .then(() => finalize())
    //       .catch(error => {
    //         console.log(error)
    //         finalize()
    //       })
    //   } else {
    //     finalize()
    //   }
    // },

    fetchClientInfo () {
      if (this.companyId && this.companyId.length > 10) {
      this.getCompanyById(this.companyId)
        .then(response => {
          const client = response.data
          this.brokerId = client.broker
          localStorage.setItem("brokerId", this.brokerId)
          const clientBanklist = client.banklist || []
          const banks = clientBanklist.map(n => ({
            name: n.name,
            id: n.id,
            selected: n.selected,
            limit: n.limit,
            status: n.status,
            timeDue: n.timeDue,
            overrideMode: n.isOverride,
            email: n.email
          }))
          this.banklist = banks
          localStorage.setItem('banklist', JSON.stringify(banks))
          
          const userName = localStorage.getItem('userName')
          const userEmail = localStorage.getItem('userEmail')
          const userInfo = {
            companyName: client?.name, // name of the company
            companyRepresentative: userName, // name of the individual using the application on behalf of the company
            email: userEmail,
            cnpj: client?.cnpj,
            phone: client?.phone,
            region: client?.region
          }
          this.userInfo = userInfo
          localStorage.setItem('userInfo', JSON.stringify(userInfo))
          this.originalUserInfo = JSON.parse(JSON.stringify(userInfo))
          this.isUserInfoSaved = true

          this.getBrokerById(this.brokerId)
            .then(response => {
              const brokerCnpj = response.data.cnpj
              localStorage.setItem('brokerCnpj', JSON.stringify(brokerCnpj))
              const brokerName = response.data.name
              localStorage.setItem('brokerName', JSON.stringify(brokerName))
            })
            .catch(error => {
              console.log(error)
            })
        })
        .catch(error => {
          console.log(error)
        })
      }
      else if (this.bankId) {
      this.getBankById(this.bankId)
        .then(response => {
          const client = response.data
          const userName = localStorage.getItem('userName')
          const userEmail = localStorage.getItem('userEmail')
          const userInfo = {
            companyName: client?.name, // name of the company
            companyRepresentative: userName, // name of the individual using the application on behalf of the company
            email: userEmail,
            cnpj: client?.cnpj,
            phone: client?.phone,
            region: client?.region
          }
          this.userInfo = userInfo
          localStorage.setItem('userInfo', JSON.stringify(userInfo))
          this.originalUserInfo = JSON.parse(JSON.stringify(userInfo))
          this.isUserInfoSaved = true
        })
        .catch(error => {
          console.log(error)
        })
      }
    },
    saveBanklist () {
      const banklistToSave = this.banklist.map(n => ({
          name: n.name,
          id: n.id,
          selected: n.selected,
          limit: n.limit,
          status: n.status,
          timeDue: n.timeDue,
          overrideMode: n.isOverride,
          email: n.email
      }))

      localStorage.setItem('banklist', JSON.stringify(banklistToSave))

      // also keep in memory a deep copy for comparisons
      this.originalBanklist = JSON.parse(JSON.stringify(this.banklist))
      this.isBanklistSaved = true
      this.snackbar.open(this.$t('instructions.bankListSaved'), 'green')

      const payloadPutCompany = {
        id: this.companyId,
        name: this.userInfo.companyName,
        cnpj: this.userInfo.cnpj,
        // broker: this.brokerId,
        banklist: banklistToSave
      }
      this.putCompany(payloadPutCompany)
        .then(() => {})
        .catch(error => {
          this.snackbar.open(error, 'red')
          console.log(error)
        })

        // this.getBrokerClients(this.brokerId)
        //   .then(response => {
        //     const clients = response.data.clients || []
        //     const updatedClients = clients.map(c =>
        //       c.id === this.companyId ? this.client : c
        //     )
        //     this.saveBrokerClients(updatedClients, this.brokerId)
        //       .catch(error => console.log(error))
        //   })
        //   .catch(error => {
        //     console.log(error)
        //   })

      this.originalBanklist = JSON.parse(JSON.stringify(this.banklist))
      this.isBanklistSaved = true
    },
    startSmoothScroll() {
      this.$nextTick(() => {
        const track = this.$refs.carouselTrack
        if (!track) return

        let scrollPos = 0
        const speed = 0.5

        this.intervalId = setInterval(() => {
          scrollPos += speed
          track.scrollLeft = scrollPos

          if (scrollPos >= track.scrollWidth / 2) {
            scrollPos = 0
          }
        }, 20)
      })
    },
    logoutClicked () {
      this.logout()
        .then(() => {
          this.authenticated = false
          this.userId = undefined
          this.removeSessionLocalStorage()
          this.$router.push("/")
        })
        .catch((error) => {
          this.snackbar.open(this.$t('extras.logoutError'), 'error')
          console.log(error)
        })
    },
    linkToBilling()
    {
      this.$router.push('/grid/billing')
    },
    linkToGuide()
    {
      this.$router.push('/grid/user-guide')
    },
    fetchMockBanks () {
      if (this.isMockDataOn) {
        this.getMockBanks()
          .then(response => {
            const isBroker = this.isBroker

            const banks = response.data.banks.map(b => ({
              name: b.name,
              id: b.id,
              timeDue: b.timeDue,
              overrideMode: b.isOverride,
              email: b.email,
              ...(isBroker ? {} : { selected: false, limit: 100000 })
            }))

            if (!isBroker) {
                const savedBanks = localStorage.getItem('banklist')
                if (savedBanks) {
                  this.banklist = JSON.parse(savedBanks)
                  this.originalBanklist = JSON.parse(savedBanks)
                  this.isBanklistSaved = true
                }
            } else {
              this.banklist = banks
            }

        })
        .catch(error => {
          console.log(error)
        })
      } else return
    },
    removeLocalStorages() {
      localStorage.removeItem('fxMarketEconomicCalendar')
      localStorage.removeItem('fxMarketDailyData')
      localStorage.removeItem('avgPtax')
      localStorage.removeItem('lastFetchHourlyTime')
      localStorage.removeItem('fxMarketNews')
      localStorage.removeItem('fxMarketIntradayData')
      localStorage.removeItem('cachedMarketData')
    },
    onSwitchChange () {
      this.removeLocalStorages()
      this.toggleMockData(this.isMockDataOn)

      setTimeout(() => {
        window.location.reload()
      }, 500)
    },
    closeGroup(index) {
      this.$set(this.openGroups, index, false)
    },
    closeAllGroups() {
      Object.keys(this.openGroups).forEach(index => {
        this.$set(this.openGroups, index, false)
      })
    },
    redirectToProPurchase () {
      const url = '#'
      window.open(url, "_blank")
    },
    async checkIsClientPartner(brokerId) {
      try {
        if (!brokerId) {
          this.isClientPartnerFlag = false
          return
        }

        const response = await this.getBrokerById(brokerId)
        this.masterPartner =  response.data?.partmaster_id
        localStorage.setItem('masterBroker', response.data?.partmaster_id)
        const partmaster_id = response.data?.partmaster_id

        this.isClientPartnerFlag = Boolean(partmaster_id)
      } catch (err) {
        console.error(err)
        this.isClientPartnerFlag = false
      }
    }
  },
  computed: {
    defaultTimeSettings() {
      return useSettingsStore().defaultTimerForRFQ
    },
    ...mapWritableState(useAuthStore, [
      "authenticated",
      "userId"
    ]),
    ...mapWritableState(useSettingsStore, [
      "isMockDataOn",
    ]),
    ...mapWritableState(useFxMarketStore, [
      "fxMarketIntradayData",
      "fxMarketNews",
      "fxMarketAvgPtax",
      "fxMarketDailyData",
      "fxMarketEconomicCalendar",
      "fxMarketLoading"
    ]),
    ...mapState(useFxMarketStore, [
      "getFxMarketIntradayData",
      "getFxMarketIsLoading",
    ]),
    ...mapState(useSettingsStore, [
     "timezone",
     "fontsize",
     "defaultSettlement"
    ]),
    handleLogo(){
      if(this.isPartner)
      {
        if(this.logo) return this.logo
        if(!this.logo && this.logoMasterPartner) {
          return this.logoMasterPartner;
        }
      }
      if((this.isBroker || this.isPro) && this.logo) return this.logo
      return require('./../assets/clearfxai-logo.png')
    },
    logoIdCheck(){
      return this.isPartner ? this.masterPartner : this.brokerId
    },
    isClientPartner() {
      return this.isClientPartnerFlag
    },
    snackbar () {
      return useSnackbarStore()
    },
    heightToolBar(){
      if (this.fontSizeSettings === 'SM'){
        if (this.width > 1200) return 120;
        else if (this.width > 1000) return 110
        else if (this.width > 800) return 150
        else return 130;
      }
      else if (this.fontSizeSettings === 'MD') {
        if (this.width > 1200) return 125;
        else if (this.width > 1000) return 120
        else if (this.width > 800) return 160
        else return 130;
      }
        else if (this.fontSizeSettings === 'LG') {
        if (this.width > 1200) return 135;
        else if (this.width > 1000) return 120
        else if (this.width > 800) return 170
        else return 130;
      }
    },
    menuListWithFlags(){
        return this.menusList.map((m, i) => {
      const isDropDown = m.title === this.$t("menus.risk") || m.title === this.$t("menus.trading") || m.title === this.$t('menus.reports')
      const execution = m.title === this.$t('menus.trading')
      const isDisabled = !this.isMockDataOn && [this.$t('menus.pricer'), this.$t('menus.risk'), this.$t('menus.data')].includes(m.title)

      const hasBeta =
        m.title === this.$t('menus.data') || m.title === this.$t('menus.risk') ||  m.title === this.$t('menus.pricer' )

      return { ...m, isDropDown, execution, isDisabled, hasBeta }
          })
    },
    isClearfxAI () {
      const auth = useAuthStore()
      const companyUserIds = [
        'f5da0296-6779-437e-a924-f859584aae6a',
        '9dbc4730-b471-4eaa-ab14-76eba5fc7786',
        'a53593fc-839f-45c1-921a-a3e4ff2c5275',
        '46d4a017-653a-45f5-8d8b-d599194b9718',
        'a84b1c2d-ef3g-4h5i-6j7k-8l9m0n1o'
      ]
      const userId = localStorage.getItem('userId')
      return companyUserIds.includes(userId)
    },
    hasPendingChanges () {
      return this.pendingSelectedChanges.size > 0 || this.pendingLimitChanges.size > 0
    },
    selectedCount() {
      return this.banklist.filter(inst => inst.selected).length
    },
    isPtBRLocale() {
      return this.$i18n.locale === "pt"
    },
    menusList() {
      if (this.isBroker) {
        return [
          {
            title: this.$t("menus.dashboard"),
            menus: [
              { label: this.$t("menus.dashboard"), to: "/grid/broker", restricted: true, disabled: !this.isMockDataOn  }
            ]
          },
           {
              title: this.$t("menus.trading"),
              menus: [
                { label: this.$t("menus.grid"), to: "/grid/trading" },
              ]
          },
          {
            title: this.$t("menus.reports"),
            menus: [
              { label: this.$t("menus.rfqs"), to: "/grid/reports" },
              { label: this.$t("menus.reportsOperation"), to: "/grid/operation-reports" },
            ]
          },
          {
            title: this.$t("menus.market"),
            menus: [
              { label: this.$t("menus.market"), to: "/grid/fxmarket" },
            ]
          },
        ]
      } else if (this.isMarkets) {
          return [
            {
              title: this.$t("menus.market"),
              menus: [
                { label: this.$t("menus.market"), to: "/grid/fxmarket" },
              ]
            }
          ]
      } else if (this.isConsole) {
          return [
            {
              title: this.$t("menus.console"),
              menus: [
                { label: this.$t("menus.console"), to: "/grid/console" },
              ]
            }
          ]
      } else if(this.isPartner) {
          return [
          {
            title: this.$t("menus.dashboard"),
            menus: [
              { label: this.$t("menus.dashboard"), to: "/grid/partner", restricted: true, disabled: !this.isMockDataOn  }
            ]
          },
          {
              title: this.$t("menus.trading"),
              menus: [
                { label: this.$t("menus.grid"), to: "/grid/trading" },
              ]
          },
          {
            title: this.$t("menus.reports"),
            menus: [
              { label: this.$t("menus.rfqs"), to: "/grid/reports" },
              { label: this.$t("menus.reportsOperation"), to: "/grid/operation-reports" },
            ]
          },
          {
            title: this.$t("menus.market"),
            menus: [
              { label: this.$t("menus.market"), to: "/grid/fxmarket" },
            ]
          },
        ]

      } else if (this.isPricer) {
          return [
            {
              title: this.$t("menus.engine"),
              menus: [
                { label: this.$t("menus.engine"), to: "/grid/engine" },
              ]
            },
            {
              title: this.$t("menus.blotter"),
              menus: [
                { label: this.$t("menus.blotter"), to: "/grid/blotter" },
              ]
            },
            {
              title: this.$t("menus.clients"),
              menus: [
                { label: this.$t("menus.clients"), to: "/grid/clients" },
              ]
            }
          ]
      }

      return [

        // {
        //   title: this.$t("menus.data"),
        //   menus: [
        //     { label: this.$t("menus.data"), to: "/grid/data/pricer", restricted: true },
        //   ]
        // },
        // {
        //   title: this.$t("menus.risk"),
        //   menus: [
        //     { label: this.$t("menus.cashflow"), to: "/grid/cashflow", restricted: true },
        //     { label: this.$t("menus.exposure"), to: "/grid/exposure", restricted: true },
        //   ]
        // },
        {
          title: this.$t("menus.trading"),
          menus: [
            { label: this.$t("menus.operations"), to: "/grid/operations" },
            { label: this.$t("menus.grid"), to: "/grid/trading" },
          ]
        },
        {
          title: this.$t('menus.reports'),
          menus: [ 
            { label: this.$t("menus.rfqs"), to: "/grid/reports" },
            { label: this.$t("menus.reportsOperation"), to: "/grid/operation-reports" },
            ]
        },
        {
          title: this.$t("menus.market"),
          menus: [
            { label: this.$t("menus.market"), to: "/grid/fxmarket" },
          ]
        },
      ]
    },
    getRole () {
      const titles = {
        markets: '',
        pro: 'PRO',
        broker: 'Broker',
        pricer: 'Pricer',
        partner: 'Partner'
      }
      const title = titles[this.getUserRoleFromLocalStorage()]
      return title
    },
    isBroker () {
      return this.getUserRoleFromLocalStorage() === 'broker'
    },
    isPartner () {
      return this.getUserRoleFromLocalStorage() === 'partner'
    },
    isMarkets () {
      return this.getUserRoleFromLocalStorage() === 'markets'
    },
    isPricer () {
      return this.getUserRoleFromLocalStorage() === 'pricer'
    },
    isPro () {
      return this.getUserRoleFromLocalStorage() === 'pro'
    },
    isConsole () {
      return this.getUserRoleFromLocalStorage() === 'console'
    },
    fxMarketIntradayList () {
      if (!this.getFxMarketIntradayData) return
      const mock = {
        tickers: ["USD/BRL", "EUR/BRL", "JPY/BRL", "EUR/USD", "USD/JPY"],
        data: {
          "USD/BRL": {
            "2025-07-15 09:40:00": { "1. open": "5.5772" }
          },
          "EUR/BRL": {
            "2025-07-15 09:40:00": { "1. open": "6.4835" }
          },
          "JPY/BRL": {
            "2025-07-15 09:40:00": { "1. open": "0.0375" }
          },
          "EUR/USD": {
            "2025-07-15 09:40:00": { "1. open": "1.1623" }
          },
          "USD/JPY": {
            "2025-07-15 09:40:00": { "1. open": "148.8400" }
          }
        }
      }

      return this.isMockDataOn
        ? mock.data
        : this.getFxMarketIntradayData?.data
    },
    duplicatedFxMarketIntradayList() {
      const entries = Object.entries(this.fxMarketIntradayList || {});
      return [...entries, ...entries]
    },
    editUserInfo () {
      this.editForm = { ...this.userInfo }
      this.showEditDialog = true
    },
    roleBackgroundColor () {
      if (this.isBroker) return '#0155bb'
      if(this.isPartner) return 'green'
      if (this.isPricer) return '#554f4f'
      return 'transparent'
    }
  }
}
</script>

<style scoped>
::v-deep .v-toolbar__extension {
  height: 42px !important;
}

::v-deep .v-tabs-bar {
  align-items: center
}
::v-deep .v-toolbar__extension {
  padding: 0 !important;
}

::v-deep  .font-size-group .v-input--radio-group__input  {
  display:flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap:2rem;
}
.ticker-wrapper {
  overflow: hidden;
  max-width: 650px;
  min-width: 125px;
  margin-top: 15px;
}

.ticker-track {
  display: flex;
  width: max-content;
  min-width: 125px;
  animation: scrollTicker linear infinite;
}

.ticker-item {
  flex-shrink: 0;
  max-width: 160px;
  margin-right: 8px;
}

.active-submenu {
  background-color: #1e1e1e !important;
  color: #0073ff !important;
  cursor: not-allowed;
}

.default-disabled {
  opacity: 0.4;
  pointer-events: none;
  color: #aaa !important;
}

.hoverable-menu:hover {
  background-color: rgba(255, 255, 255, 0.1) !important;
}

.disabled-link {
  opacity: 0.4;
  pointer-events: none;
  cursor: not-allowed;
}

.centered-input >>> input {
  text-align: center
}

.remove-spin >>> input[type="number"] {
  -webkit-appearance: none; /* Chrome, Safari, Edge */
  -moz-appearance: textfield; /* Firefox */
  appearance: textfield; /* Outros navegadores */
}

.remove-spin >>> input[type="number"]::-webkit-inner-spin-button,
.remove-spin >>> input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

@keyframes scrollTicker {
  from {
    transform: translateX(0%);
  }
  to {
    transform: translateX(-50%);
  }
}

.upload-files{
  width:90%;
}
.disabled-text{
  color:#515151;
}
.highlight-text{
  color: white; 
}

::v-deep div.v-radio.disabled.v-radio--is-disabled.theme--dark > div > i {
  color: #303030;
}
.app-bar-responsive{
    display:flex;
    flex-direction: column;
    flex:1 1 auto;
    min-width:0;
}

.ticker-wrapper,
.economic-calendar,
.news-carousel {
  min-width: 0;
  flex-shrink: 1;
}
</style>
