<template>
  <div>
    <v-row no-gutters class="mb-8 px-8">
      <v-col
        xs="0"
        sm="0"
        md="0"
        lg="1"
        xl="1"
      >
      </v-col>

      <v-col
        xs="12"
        sm="12"
        md="12"
        lg="10"
        xl="10"
        class="pt-8"
      >
        <div class="d-flex flex-column">
          <v-row class="d-flex pb-8">
            <v-col class="d-flex justify-center text-h3 font-weight-light text-center">
              {{ $t('title.trading') }}
            </v-col>
            <v-col v-if="false" cols="2" class="font-weight-light">
              <!-- {{ now }} -->
            </v-col>
          </v-row>
          <!--spotFx and ndf-->
          <v-card class="pa-5 rounded-lg">
            <v-tabs>
              <v-tab @click="activeTab = 'fxSpot'">FX-Spot</v-tab>
              <v-tab disabled @click="activeTab = 'ndf'">FX-NDF</v-tab>
              <v-tab v-if="false" @click="activeTab = 'commodities'">Commodities</v-tab>
            </v-tabs>
            <v-row class="mt-2" no-gutters>
            <v-col cols="1">
            </v-col>

            <v-col cols="10">
              <v-row no-gutters class="justify-center">
                <v-col cols="10"  class="d-flex justify-center flex-gap-8">

                  <!--settlement or maturity-->
                  <div>
                    <div v-if="activeTab === 'fxSpot'">
                      <FxSpot
                      :operationList="operationList"
                      :loadingNewRfq="loadingNewRfq"
                      :gridActive="gridActive"
                      :preselectOperationId="pendingOperationId"
                      @settlement="handleSettlementChange"
                      @side="handleSideChange"
                      @ccy="handleCurrencyChange"
                      @operation="handleOperationChange"
                      />
                    </div>
                    <div v-else-if="activeTab === 'ndf'">
                      <FxNdf
                      :loadingNewRfq="loadingNewRfq"
                      :gridActive="gridActive"
                      @maturityDate="handleMaturityChange"
                      @side="handleSideChange"
                      @ccy="handleCurrencyChange"
                      />
                    </div>

                    <div v-if="false">
                      <Commodities
                      :loadingNewRfq="loadingNewRfq"
                      :gridActive="gridActive"
                      @side="handleSideChange"
                      @selectedCommodity="handleCommodityChange"
                      />
                    </div>
                  </div>
                </v-col>
              </v-row>

              <v-row class="justify-center">
                <v-col
                  v-if="activeTab !== 'commodities'"
                  cols="10"
                  class="d-flex flex-gap-4 align-baseline justify-center"
                >
                  <v-text-field
                    v-model="amount"
                    v-money="money"
                    :label="$t('quoteInfo.amountCcy')"
                    :disabled="loadingNewRfq || gridActive"
                    class="mr-md-2"
                    style="max-width: 300px;"
                  >
                  </v-text-field>

                  <v-btn
                    elevation="0"
                    tile
                    color="primary"
                    @click="makeQuote()"
                    :loading="loadingNewRfq"
                    :disabled="disableQuoteButton"
                    class="mt-2 mt-md-0"
                  >
                    {{ $t('quoteInfo.quote') }}
                  </v-btn>
                </v-col>

                <v-col
                cols="10"
                class="d-flex flex-gap-4 align-baseline justify-center"
                v-else>
                  <v-text-field
                    v-model="volume"
                    :key="activeTab"
                    :label="$t('quoteInfo.volumeBushels')"
                    :disabled="loadingNewRfq || gridActive"
                    class="mr-md-2"
                    @focus="volume === 0 && (volume = '')"
                    style="max-width: 300px;"
                  >
                  </v-text-field>

                  <v-btn
                    elevation="0"
                    tile
                    color="primary"
                    @click="makeQuote()"
                    :loading="loadingNewRfq"
                    :disabled="disableQuoteButton || true"
                    class="mt-2 mt-md-0"
                  >
                    {{ $t('quoteInfo.quote') }}
                  </v-btn>
                </v-col>
              </v-row>

              <v-divider class="mb-10 mt-8"></v-divider>

              <div
                v-if="(showTimer && !showQuoteConfirmationDialog) || loadingNewRfq"
                class="mb-4"
              >
                <BaseTimer
                  v-if="currentQuoteForTimer"
                  :timeLimit="currentQuoteForTimer.expiration"
                  @timeDue="declineQuote('timer_expired')"
                />

                <div
                  v-else-if="loadingNewRfq"
                  class="d-flex flex-column align-center justify-center py-6 text-center"
                  style="min-height: 4.5rem"
                >
                  <v-progress-circular
                    indeterminate
                    color="primary"
                    :size="36"
                    :width="4"
                    class="mb-3"
                  />
                </div>
              </div>

            <QuoteGrid
              :quote="quote"
              :bank-list="banklist"
              :quoteList="quoteList"
              :gridActive="gridActive"
              :disableGrid="disableGrid"
              :bestRate="bestRate"
              :selectedSpread="brokerSpread"
              :amount="convertCurrencyToNumber(amount)"
              @openConfirmation="openConfirmation"
              @declineQuote="declineQuote"
            />
            </v-col>
            <v-col cols="1">
            </v-col>
          </v-row>
          </v-card>
        </div>
      </v-col>

      <v-col
        xs="0"
        sm="0"
        md="0"
        lg="1"
        xl="1"
      >
      </v-col>
    </v-row>
    
    <v-row no-gutters>
      <v-col cols="12">
        <v-sheet
          width="100%"
          class="py-12 px-8"
        >
          <v-row no-gutters>
            <v-col
              xs="0"
              sm="0"
              md="0"
              lg="1"
              xl="1"
            >
            </v-col>

            <v-col
              xs="12"
              sm="12"
              md="12"
              lg="10"
              xl="10"
              class="pt-4 d-flex flex-column"
            >
              <div class="text-h5 font-weight-light mb-10">
                RFQs
              </div>

              <v-card outlined>
                <v-data-table
                  :loading="tableLoading"
                  dense
                  :headers="rfqHeaders"
                  :items="rfqElements"
                  class="elevation-1 rfq-blotter-table"
                  @click:row="goToRfqReport"
                >
                <template #[`item.bank_label`] = "{item}">
                  <span>{{ item.bank_label  ||  '-' }}</span>
                </template>
                <template #[`item.rfq_maturity`] = "{item}">
                  <span>{{ item.rfq_security === 'FXNDF'  ? formatMaturityDate(item.rfq_maturity) : '-' }}</span>
                </template>

                <template #[`item.rfq_spotsett`] = "{item}">
                  <span>{{ item.rfq_security !== 'FXNDF'  && item.rfq_spotsett ? item.rfq_spotsett.toUpperCase() : '-' }}</span>
                </template>

                  <template #[`item.rfq_side`]="{ item }">
                    <span 
                    :class="{
                      'alive--text': item.rfq_side === 'BUY',
                      'orangeColor--text': item.rfq_side === 'SELL'
                      }"
                    >
                      {{ $t('quoteInfo.' + item.rfq_side? item.rfq_side.toUpperCase() : '-') }}
                    </span>
                  </template>
                </v-data-table>
              </v-card>
            </v-col>

            <v-col
              xs="0"
              sm="0"
              md="0"
              lg="1"
              xl="1"
            >
            </v-col>
          </v-row>
        </v-sheet>
      </v-col>
    </v-row>

    <v-snackbar
      v-model="snackbar"
      color="green accent-4"
      :timeout="4000"
      bottom
    >
      <span class="black--text">
        Successful deal
      </span>
    </v-snackbar>

    <v-snackbar
      v-model="snackbarExpiredQuote"
      color="attention"
      :timeout="5000"
      bottom
    >
      <span class="black--text">
        {{ $t('extras.quoteExpired') }}
      </span>
    </v-snackbar>

    <v-snackbar
      v-model="snackbarCancelledQuote"
      color="attention"
      :timeout="5000"
      bottom
    >
      <span class="black--text">
        {{ $t('extras.quoteCancelled') }}
      </span>
    </v-snackbar>

    <v-snackbar
      v-model="snackbarCompanyBlocked"
      color="attention"
      :timeout="5000"
      bottom
    >
      <span class="black--text">
        {{ $t('extras.companyBlocked') }}
      </span>
    </v-snackbar>

    <v-snackbar
      v-model="showNoBanks"
      color="attention"
      :timeout="5000"
      bottom
    >
      <span class="black--text">
        {{ "Please select a bank before continuing" }}
      </span>
    </v-snackbar>

    <!-- QUOTE CONFIRMATION DIALOG -->
    <QuoteConfirmationDialog
      v-model="showQuoteConfirmationDialog"
      :loading-order="loadingOrder"
      :success-order="successOrder"
      :cancelled-order="cancelledOrder"
      :current-quote-for-timer="currentQuoteForTimer"
      :side="side"
      :ccy="ccy"
      :settlement="settlement"
      :amount="convertCurrencyToNumber(amount)"
      :selected-quote="selectedQuote"
      :selectedSpread="brokerSpread"
      :quote-expiration-time="quoteExpirationTime"
      :format-time-and-date="formatTimeAndDate"
      :rfq-list="rfqList"
      @confirm="makeOrder"
      @cancel="cancelConfirmation"
      @close="closeDialog"
    />

    <!-- GLOBAL SNACKBAR -->
    <v-snackbar
      v-model="globalSnackbar.show"
      :timeout="4000"
      :color="globalSnackbar.color"
      bottom
    >
      <div class="black--text text-center w-100">
        {{ globalSnackbar.message }}
      </div>
    </v-snackbar>
  </div>
</template>

<script>
import {
  useExecutionStore,
  useAuthStore,
  useSettingsStore,
  useInteractionEmailStore,
} from "../store/index"
import { mapState, mapActions, mapStores } from "pinia"
import * as utils from "../utils.js"
import { VMoney } from "v-money"
import BaseTimer from "./../components/BaseTimer.vue"
import QuoteGrid from '@/components/QuoteGrid.vue'
import QuoteConfirmationDialog from '@/components/QuoteConfirmationDialog.vue'
import FxSpot from "@/components/trading/FxSpot.vue"
import FxNdf from "@/components/trading/FxNdf.vue"
import Commodities from "@/components/trading/Commodities.vue"

export default {
  directives: {
    money: VMoney
  },
  components: {
    FxSpot,
    FxNdf,
    Commodities,
    BaseTimer,
    QuoteGrid,
    QuoteConfirmationDialog
  },
  data () {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const isoTomorrow = new Date(
      tomorrow.getTime() - (tomorrow.getTimezoneOffset() * 60000)
    )
    .toISOString()
    .substring(0, 10)
    return {
      operationList: [],
      rfqListDocuments: [],
      wasFilesUploaded: false,
      filesUpload: false,
      menu:false,
      pendingOperationId: null,
      activeTab: "fxSpot",
      maturityDate:isoTomorrow,
      banklist: [],
      selectedBanks: [],
      side: undefined,
      ccy: undefined,
      operationAlias:null,
      settlement: undefined,
      amount: 0,
      tableLoading : true,
      volume:0,
      commodity: undefined,
      snackbar: false,
      snackbarExpiredQuote: false,
      snackbarCancelledQuote: false,
      snackbarCompanyBlocked: false,
      showNoBanks: false,
      interval: null,
      timeoutId: null,
      quote: undefined,
      rfqList: [],
      quoteTemplate: [
        {
          "rfq_id": "",
          "rfq_status": "",
          "rfq_cancel_reason": "",
          "rfq_quote":[
            {
                "rfq_quote_time": -1,
                "rfq_quote_time_s": "-1",
                "rfq_quote_px": "-",
                "rfq_quote_spread_avg": "-",
                "rfq_quote_spread_ptax": "-",
                "rfq_quote_fwdpoints": -1,
                "rfq_quote_spotrate": -1,
                "rfq_quote_exptime": -1,
                "rfq_quote_exptime_s": "-1",
                "counterparty_name": "-"
            }
          ]
        
        },
      ],
      userRole: undefined,
      loadingNewRfq: false,
      gridActive: false,
      rfqId: undefined,
      rfqVenueId: "43633296000190",
      rfqVenueSecret: "IR73iLHhwL",
      rfqText: "REMESSA",
      rfqQuoteExptime: undefined,
      rfqQuoteExptimeS: undefined,
      rfqRequestHash: undefined,
      rfqCancelEmailEligible: false,
      rfqCancellationHandled: false,
      brokerCnpj: null,
      loadingOrder: false,
      retryCount: 0,
      showQuoteConfirmationDialog: false,
      selectedQuote: undefined,
      successOrder: false,
      cancelledOrder: false,
      quoteTimedue: false,
      eventSource: undefined,
      isManualClose: false,
      confirmedQuoteSnapshot: [],
      globalSnackbar: {
        show: false,
        message: '',
        color: 'success'
      },
      // timer
      showTimer: false,
      quoteExpirationTime: null,
      currentQuote: null,
      brokerId: null,
      brokerSpread:null,
      brokerName: '',
      brokerEmail: '',
      companyId: null,
      companyName: '',
      companyCnpj: undefined,
      companyEmail: ''
    }
  },
    mounted () {
    this.executionStore.selectedId = null;
    this.resetGrid()
    this.loadbankListFromStorage()
    this.pendingOperationId = this.$route.query.operation_id || null
    this.userRole = localStorage.getItem('userRole')
    this.brokerId = localStorage.getItem("brokerId")
    this.brokerName = localStorage.getItem('brokerName')
    this.brokerCnpj = JSON.parse(localStorage.getItem('brokerCnpj') || 'null')
    this.companyId = localStorage.getItem("companyId") || []
    this.companyEmail = localStorage.getItem("userEmail")
    const banklist = JSON.parse(localStorage.getItem('banklist')) ||[]
    this.selectedBanks = banklist.map(b => b.name)
    this.getBrokerCompanyInfo()
    this.getBankListViaBrokerOrCompanyId()
    this.getUserByBrokerID(this.brokerId)
      .then(response => {
        const brokerEmail = response.data.email
        this.brokerEmail = brokerEmail
        localStorage.setItem('brokerEmail', JSON.stringify(brokerEmail))
      })
      .catch((error) => {
        console.log(error)
      })
    this.fetchOperationIdList()
    this.intradayInterval = setInterval(() => {
      this.fetchIntradayOrderList()
      this.fetchOperationIdList()
    }, 3000)
  },
  beforeDestroy () {
    clearTimeout(this.timeoutId)
    clearTimeout(this.intradayInterval)
  },
  computed: {
    ...mapStores(useExecutionStore),
    ...mapState(useSettingsStore, [
      "isMockDataOn",
      "getDefaultTimerForRFQ"
    ]),
    now () {
      return utils.formatTimeAndDate()
    },
    currentQuoteForTimer () {
      return this.currentQuote
    },
    quoteList () {
      if (!this.quote) {
        return [
          {
          "rfq_id": "",
          "rfq_status": "",
          "rfq_cancel_reason": "",
          "rfq_quote":[
            {
                "rfq_quote_time": -1,
                "rfq_quote_time_s": "-1",
                "rfq_quote_px": "-",
                "rfq_quote_spread_avg": "-",
                "rfq_quote_spread_ptax": "-",
                "rfq_quote_fwdpoints": -1,
                "rfq_quote_spotrate": -1,
                "rfq_quote_exptime": -1,
                "rfq_quote_exptime_s": "-1",
                "counterparty_name": "-"
              }
            ]
          }
        ]
      }
      return this.quote
    },
    bestRate () {
      let bestRate = null

      if (!this.quoteList || this.quoteList.length === 0) {
        return bestRate
      }
        const isBuy = this.side === 'BUY'
        bestRate = this.quoteList[0].rfq_quote.reduce((prev, current) => {
          if (!prev) return current
          if (isBuy) {
            return current.rfq_quote_px < prev.rfq_quote_px ? current : prev
          } else {
            return current.rfq_quote_px > prev.rfq_quote_px ? current : prev
          }
        }, undefined)

        bestRate.rfq_id = this.quoteList[0]?.rfq_id

      return bestRate
    },
    disableGrid () {
      return !this.gridActive && (this.quote && !this.quote[0].rfq_quote_id)
    },
    rfqElements () {
      const list = Array.isArray(this.rfqList) ? this.rfqList : []
      const filtered = list.filter(item =>
        String(item.rfq_status) === 'DEAL'
      )

      return filtered.map(element => {
        // const confirmationOfUpload = JSON.parse(localStorage.getItem('fileId'))
        const result = {}

        result.rfq_id = element.rfq_id
        result.rfq_ccy = element.rfq_ccy
        result.rfq_side = element.rfq_side
        result.rfq_amount = this.formatPrice(element.rfq_orderqty)
        result.rfq_spotsett = element.rfq_spotsett ||  ''
        result.rfq_deal_time = utils.formatDateAndTimeFromString(element.rfq_timestamp_s)
        result.rfq_security = element.rfq_security
        //MATURITY NO MOMENTO É RFQ_SETT_BRL NO MOMENTO 
        result.rfq_maturity = element.rfq_sett_brl
        //fixing date = rfq_sett_ccy ATM -> tira data fixing date e coloca d-1
        // const bankName = this.isMockDataOn ? element.counterparty_name : 'Banco Fibra'
        const bank = this.banklist.find(b => b.id === element.bank_id)
        result.bank_label = bank ? bank.name : 'Banco Fibra'
        if (this.isMockDataOn) {
          result.bank_label = element.counterparty_name
        }
        // result.documents = confirmationOfUpload?.some(i=>i === element.rfq_id);
        // result.documents = this.rfqListDocuments.some(i=>i === element.rfq_id)
        return result
      })
    },
    money() {
      let prefix = ""
      if (this.ccy === "USD") {
        prefix = "$ "
      } else if (this.ccy === "EUR") {
        prefix = "€ "
      }
      return {
        thousands: ",",
        prefix: prefix
      }
    },
    disableQuoteButton() {
      return this.activeTab !== 'commodities' ? this.gridActive || (this.activeTab === 'fxSpot' && !this.operationAlias)  ||  this.convertCurrencyToNumber(this.amount) === 0.00 : this.volume === 0 ;
    },
    rfqHeaders() {
      return [
        { text: this.$t('quoteInfo.dealTime'), value: 'rfq_deal_time', sortable: false },
        // { text: 'Status', value: 'rfq_deal', sortable: false },
        { text: this.$t('quoteInfo.ccy'), value: 'rfq_ccy', sortable: false },
        { text: this.$t('quoteInfo.side'), value: 'rfq_side', sortable: false },
        { text: this.$t('quoteInfo.amount'), value: 'rfq_amount', sortable: false },
        { text: this.$t('quoteInfo.settlement'), value: 'rfq_spotsett', sortable: false },
        { text: this.$t('quoteInfo.maturityText'), value: 'rfq_maturity', sortable: false },
        { text: this.$t('quoteInfo.bankName'), value: 'bank_label', sortable: false },
        { text: this.$t('quoteInfo.id'), value: 'rfq_id', sortable: false },
      ]
    },
    makeOrderPayload () {
      const now = new Date()
      const { year, month, day, hour, minute } = utils.getDateParts(now, true)
      const isoString = `${year}-${month}-${day}T${hour}:${minute}:00`
      const timestamp = new Date(isoString).getTime()
      const venueId = this.isMockDataOn
        ? this.selectedQuote.rfq_venue_id
        : this.rfqVenueId

      let price = this.selectedQuote.rfq_quote_px
      if (this.selectedQuote.rfq_quote_px_old) {
        price = this.selectedQuote.rfq_quote_px_old
      }
      const bankId = this.selectedQuote.bank_id
      const quoteId = this.selectedQuote.rfq_quote_id
      return {
        bank_id: bankId,
        rfq_id: this.rfqId,
        rfq_venue_id: venueId,
        rfq_venue_secret: this.rfqVenueSecret,
        rfq_order_quote_id: quoteId,
        rfq_order_px: price,
        rfq_order_time: timestamp,
        rfq_order_hash: this.rfqRequestHash,
        rfq_order_text: this.rfqText,
      }
    },
    reports () {
      const amount = this.convertCurrencyToNumber(JSON.parse(JSON.stringify(this.amount)))
      const snapshot = this.confirmedQuoteSnapshot || []
      const list = Array.isArray(this.rfqList) ? this.rfqList : []
      const rfq = list.find(item => item.rfq_id === this.rfqId)
      return {
        broker_id: this.brokerId,
        client_id: this.companyId,
        rfq_amount: amount,
        rfq_ccy: this.ccy,
        rfq_deal_quoteid: this.selectedQuote?.rfq_quote_id || "-",
        rfq_deal_time: this.selectedQuote?.rfq_quote_time || "-",
        rfq_id: this.rfqId,
        rfq_security: rfq?.rfq_security || "-",
        rfq_sett_brl: rfq?.rfq_sett_brl || "-",
        rfq_lastquote: {
          quote_list:
            snapshot && snapshot[0].rfq_quote && snapshot[0].rfq_quote.length
              ? snapshot[0].rfq_quote.map((q, i) => ({
                bank_label: q.counterparty_name || "-",
                quote_bank_rate: q.rfq_quote_px || "-",
                quote_bank_time:
                  q.rfq_quote_time && q.rfq_quote_time !== -1
                    ? q.rfq_quote_time
                    : "-",
                quote_bank_timedue: q.rfq_quote_exptime || "",
                quote_id: q.rfq_quote_id || (i + 1).toString(),
                spread_avg_spot: q.rfq_quote_spread_avg || "-",
                spread_ptax: q.rfq_quote_spread_ptax || "-"
              }))
            : [],
          rfq_spotsett: this.settlement
        },
        rfq_side: this.side,
        rfq_spotsett: this.settlement
      }
    },
  },
  methods: {
    ...mapActions(useAuthStore, [
      "getUserByBrokerID"
    ]),
    ...mapActions(useExecutionStore, [
      'putOperationWithRfq',
      "getOperationIdList",
      "getRfqListWithDocument",
      "getCompanyById",
      "requestQuote",
      "getQuoteFeed",
      "makeQuoteOrder",
      "cancelQuote",
      "getIntradayOrderList",
      "getMockIntradayOrderList",
      "saveReports",
      "sendEmail",
      'getBrokerById',
      "convertCurrencyToNumber",
      "updateClients",
      'formatDefaultTimer'
    ]),
    ...mapActions(useInteractionEmailStore, [
      "cancelRfq",
      "requestRfqPriceRequest"
    ]),
    goToRfqReport (item) {
      if (!item || !item.rfq_id) return
      this.$router.push({ name: 'reports', query: { rfq_id: item.rfq_id } }).catch(() => {})
    },
    async updateOperationWithRfq(rfq_id, operation_id){
      try {
        await this.putOperationWithRfq(rfq_id, operation_id)
      } catch (error) {
        console.error(error)
      }
    },
    fetchOperationIdList () {
      this.getOperationIdList()
        .then((response) => {
          this.operationList = response.data?.operations ?? []
        })
        .catch((error) => {
          console.log(error)
        })
    },
    getBankListViaBrokerOrCompanyId()
    {
        if(this.userRole !== 'pro')
      {
          this.getBrokerById(this.brokerId)
                  .then(response =>{
                    this.banklist = response.data?.banklist
                    this.brokerSpread = response.data.spread_type === "PIPS" ? response.data.spread : response.data.spread_bps

                  })
      }        
    },
    getBrokerCompanyInfo(){
        this.getCompanyById(this.companyId)
        .then(response => {
          const cnpj = response.data.cnpj
          this.companyCnpj = cnpj
          const companyName = response.data.name
          this.companyName = companyName
        })
        .catch((error) => {
          console.log(error)
        })
      
    },
    formatTimeAndDate (timestamp) {
      return utils.formatTimeAndDate(timestamp)
    },
    formatPrice (price) {
      return utils.formatPrice(price)
    },
    handleSideChange(val)
    {
      
      this.side = val
      
    },
    handleCurrencyChange(val)
    {
      
      this.ccy = val
    },
    handleOperationChange(val)
    {
      if(this.userRole === 'broker' || this.userRole === 'partner')
      {
        this.companyId = val.companyId 
        this.getBrokerCompanyInfo()
      }
      this.operationAlias = val
    },
    handleMaturityChange(val)
    {
      
      this.maturityDate = val
    },
    handleCommodityChange(val)
    {
      this.commodity = val
    },
    formatMaturityDate(date){
      return utils.formatMaturityDate(date)
    },
   handleSettlementChange(val)
    {
      this.settlement = val
    },
    handleSideChange(val)
    {
      
      this.side = val
      
    },
    handleCurrencyChange(val)
    {
      
      this.ccy = val
    },
    handleMaturityChange(val)
    {
      
      this.maturityDate = val
    },
    handleCommodityChange(val)
    {
      this.commodity = val
    },
    makeQuote () {
      this.loadingNewRfq = true
      this.rfqCancelEmailEligible = false
      this.rfqCancellationHandled = false
      const selectedBanks = this.userRole === 'pro' ? JSON.parse(localStorage.getItem('banklist') || "[]").filter(b => b.selected).map(b => b.name) : this.banklist.map(b=>b.name)
      const selectedBanksIds = this.userRole === 'pro' ? JSON.parse(localStorage.getItem('banklist') || "[]").filter(b => b.selected).map(b => b.id) : this.banklist.map(b=>b.id)
      
      if (!selectedBanks || selectedBanks.length === 0) {
        this.showNoBanks = true
        this.loadingNewRfq = false
        return
      }
      this.makeQuotePayload()
        .then((payload) => {
          payload.broker_id = this.brokerId
          if (this.operationAlias?.id && payload.rfq_security === "FXSPOT") {
            payload.operation_id = this.operationAlias.id
          }
          return this.requestQuote(payload, selectedBanks, selectedBanksIds)
        })
        .then(async (response) => {
          const data = response.data
          if (data.rfq_status === "REJECTED") {
            this.snackbarCancelledQuote = true
            return
          }
          this.rfqId = data.rfq_id
          if (this.operationAlias?.id && data.rfq_security === "FXSPOT") {
           // this.updateOperationWithRfq(this.rfqId, this.operationAlias.id)
          }

          let approvalResponse = null
          try {
            approvalResponse = await this.requestRfqPriceRequest({
              rfqId: this.rfqId,
              brokerCnpj: this.brokerCnpj
            })
          } catch (error) {
            console.log('Failed to request RFQ email approval', error)
          }

          const shouldSendRfqEmail = Boolean(approvalResponse?.data?.email_sent)
          this.rfqCancelEmailEligible = shouldSendRfqEmail

          const timerMs = await this.resolveRfqTimerMs({
            isBankManual: shouldSendRfqEmail,
            approvalResponse
          })
          this.fetchQuoteFeed(this.rfqId, selectedBanks, selectedBanksIds, timerMs)
        })
        .catch ((error) => {
          const status = error.response ? error.response.status : null
          if (status === 403 && this.retryCount === 0) {
            this.retryCount += 1
            setTimeout(() => {
              this.makeQuote()
            }, 2000)
          }
          if (status === 401 && this.retryCount === 0) {
            this.retryCount += 1
            setTimeout(() => {
              this.makeQuote()
            }, 2000)
          }
          if (status === 403) {
            this.snackbarCompanyBlocked = true
          } else {
          this.snackbarCancelledQuote = true
          }
        })
        .finally(() => {
          this.loadingNewRfq = false
        })
    },
    getQuoteFeedHeartbeatTimeoutMs () {
      const expiration = this.currentQuote?.expiration
      if (!expiration) return null

      const remaining = expiration - Date.now()
      if (!Number.isFinite(remaining) || remaining <= 0) return null

      return Math.max(remaining, 1000)
    },
    shouldShowExpiredToast () {
      const expiration = this.currentQuote?.expiration
      if (!expiration) return false

      return Date.now() >= expiration
    },
    fetchQuoteFeed(rfqId, selectedBanks, selectedBanksId, heartbeatTimeoutMs = null) {
      const timeoutMs = Number.isFinite(heartbeatTimeoutMs)
        ? heartbeatTimeoutMs
        : this.getQuoteFeedHeartbeatTimeoutMs()

     // const rfqId = this.rfqId
      //const selectedBanks = JSON.parse(localStorage.getItem('banklist') || "[]").filter(b => b.selected).map(b => b.name)
      //const selectedBanksId = JSON.parse(localStorage.getItem('banklist') || "[]").filter(b => b.selected).map(b => b.id)
      this.eventSource = this.getQuoteFeed(
        rfqId,
        selectedBanks,
        selectedBanksId,
        (data) => {
          if (String(data.rfq_status).toUpperCase() === 'CANCELLED') {
            this.closeQuoteFeed()
            this.clearCurrentTimer()
            this.showQuoteGridDialog = false
            this.showQuoteConfirmationDialog = false
            this.showSnackbar(this.$t('extras.quoteCancelled'), 'attention')
            return
          }

          if (!this.isMockDataOn) {
            const quoteList = (data?.rfq_quote ?? []).filter(
              q => q.rfq_quote_px !== null
            );
            data.rfq_quote = quoteList
            this.quote = [
              data,
              this.quoteTemplate[0],
              this.quoteTemplate[0],
              this.quoteTemplate[0]
            ]
            this.quote[0].counterparty_name = selectedBanks[0]
          } else {
            const newQuote = data
            const rfqQuotes = newQuote.rfq_quote //array of quotes            
           
            if(!this.quote )
              {
                this.quote =[]
                  this.quote[0] = {}
              }

            this.quote = [{
              rfq_id: newQuote.rfq_id,
              rfq_status: newQuote.rfq_status,
              rfq_cancel_reason : newQuote.rfq_cancel_reason,
              rfq_quote:[...newQuote.rfq_quote]
            }]
            /*
            const venueId = newQuote.rfq_venue_id

            if (venueIds.length <= 0) return
           // if (!this.quote || t) {
           if (!this.quote) {
                //this.quote?.rfq_quotes[0].counterparty_name === this.quoteTemplate[0].counterparty_name
                console.log('!this.quote', this.quote)
              this.quote = []
            }

            //const existingIndex = this.quote.findIndex(q => q?.rfq_venue_id === venueId)

            const existingIndex = 0
            if (existingIndex !== -1) {
              this.quote = [...this.quote]
              this.quote[existingIndex] = newQuote
            } else {
              this.quote = [...this.quote, newQuote]
            }
              */
          }

          this.gridActive = true
        },
        (error) => {
          const wasManualClose = this.isManualClose
          const shouldShowExpired = this.shouldShowExpiredToast()
          this.quoteTimedue = true
          this.cancelledOrder = true
          this.closeDialog()
          clearTimeout(this.timeoutId)
          console.log(error)

          if (this.eventSource) {
            this.eventSource.close()
          }

          if (wasManualClose || !shouldShowExpired) {
            this.isManualClose = false
            return
          }

          this.isManualClose = false
          this.snackbarExpiredQuote = true
        },
        timeoutMs
      )
    },
    closeQuoteFeed() {
      if (this.eventSource) {
        this.isManualClose = true
        this.eventSource.close()
      }
    },
    fetchIntradayOrderList () {
      const brokerCnpj = localStorage.getItem('brokerCnpj')
      const companyCnpj = this.companyCnpj
      // this.getRfqListWithDocument()
      //     .then((response) => {
      //       this.rfqListDocuments = response.data.rfq_ids
      //     })
      //     .catch((error) => {
      //       console.log(error)
      //     })
      this.getIntradayOrderList(brokerCnpj.replace('"', ''), companyCnpj)
        .then((response) => {
          const elements = response.data
          this.rfqList = elements
          this.tableLoading = false
        })
        .catch((error) => {
          console.log(error)
        })
    },
    mapMockToReal(mock) {
      return {
        rfq_security: mock.product,
        rfq_sett_brl: mock.rfq_settdate_ccy2,
        rfq_sett_ccy: mock.rfq_settdate_ccy1,
        rfq_status: mock.rfq_status,
        rfq_timestamp: mock.rfq_timestamp,
        rfq_timestamp_s: mock.rfq_timestamp_s,
        rfq_id: mock.rfq_id,
        rfq_taker_id: mock.rfq_taker_id,
        rfq_orderqty: mock.amount,
        rfq_ccy: mock.ccy,
        rfq_symbol: mock.order_symbol,
        rfq_side: mock.side,
        rfq_spread: mock.spread_bps,
        rfq_spot_fx: mock.spotpx,
        rfq_px: mock.buy ?? mock.sell ?? null,
        rfq_sett: mock.sett_brl ?? mock.sett_ccy,
        broker_id: mock.broker_id,
        counterparty_name: mock.counterparty_name
      };
    },
    prepareOrderState () {
      this.clearCurrentTimer()
      this.closeQuoteFeed()
      this.loadingOrder = true
    },
    makeOrder () {
      this.prepareOrderState()

      const payload = this.makeOrderPayload

      this.makeQuoteOrder(payload)
        .then((response) => {
          const data = response.data
          if (data.rfq_status === "CANCELLED") {
            this.cancelledOrder = true
            return
          }
          let selectedRfq = this.rfqList.find(rfq=>rfq.rfq_id === this.rfqId)
          // this.updateLocalStorageDocumentation(selectedRfq ,data)

          this.updateOperationWithRfq(this.rfqId, this.operationAlias.id)
          this.successOrder = true

          this.sendConfirmedQuoteEmail()
          this.fetchIntradayOrderList()
          if (this.isMockDataOn) {
            this.saveDataToReports()
          }
        })
        .catch((error) => {
          console.log(error)
        })
        .finally(() => {
          this.loadingOrder = false
          // this.companyCnpj = undefined
        })
    },
    updateLocalStorageDocumentation(selectedRfq,data){
          let arr = JSON.parse(localStorage.getItem('operation')) || [];
          let ope = arr.find(o=>o.id === this.operationAlias?.id)
          arr= arr.filter(a=>a.id !== ope.id)
          if(ope)
          {
            ope.rfqId = this.rfqId
            ope.qty = selectedRfq.rfq_orderqty
            ope.ccy =  selectedRfq.rfq_ccy
            ope.status =  data.rfq_status !== "CANCELLED" ? data.rfq_status : ''
            ope.side = this.side
            arr.push(ope)
            localStorage.setItem('operation', JSON.stringify(arr))
          }
    },
    sendConfirmedQuoteEmail () {
      const quote = this.selectedQuote
      const time = new Date().toISOString()
      // const venueName = this.isMockDataOn ? quote?.counterparty_name : "Banco Fibra"
      const venueName = quote?.bank_name

      const payload = {
        quote_id: this.rfqId,
        client_name: this.companyName,
        broker_name: this.brokerName,
        venue_name: venueName,
        side: this.side,
        amount: this.convertCurrencyToNumber(this.amount),
        ccy: this.ccy,
        rate: quote?.rfq_quote_px,
        timestamp: utils.formatDateAndTimeFromString(time, { time: true, iso: true })
      }

        this.sendEmail({
          brokerEmail: this.brokerEmail,
          clientEmail: this.companyEmail,
          quoteData: payload,
          mailCase: 'client_to_broker'
        })
        .catch((error) => {
          console.error('Failed to send quote confirmation email', error)
        })
        .finally(() => {
          this.showSnackbar(this.$t('broker.snackBar.quoteEmail2'))
        })
    },
    saveDataToReports () {
      this.saveReports(this.reports)
        .catch((error) => {
          console.log(error)
        })
    },












































    declineQuote(reason = 'user_cancelled') {
      if (this.rfqCancellationHandled) return
      this.rfqCancellationHandled = true

      const activeQuote = this.quote?.[0]
      const rfqId = this.isMockDataOn
        ? this.rfqId
        : (activeQuote?.rfq_id || this.rfqId)

      const now = new Date().getTime()
      const { year, month, day, hour, minute } = utils.getDateParts(now, true)
      const isoString = `${year}-${month}-${day}T${hour}:${minute}:00`
      const timestamp = new Date(isoString).getTime()
      const quote = {
        "rfq_id": rfqId,
        "rfq_venue_id": this.rfqVenueId,
        "rfq_venue_secret": this.rfqVenueSecret,
        "rfq_cancel_time": timestamp,
        "rfq_cancel_message": "Taker manually declined quoted price",
      }
      if (quote.rfq_id && this.rfqCancelEmailEligible) {
        this.cancelRfq({ rfqId: quote.rfq_id, reason })
          .catch((error) => {
            console.log(error)
          })
      }
      if (!quote.rfq_id) {
        this.cancelCurrentQuote()
        this.closeQuoteFeed()
        this.resetGrid()
        return
      }
      this.cancelQuote(quote)
        .then(() => {
          this.cancelCurrentQuote()
          this.closeQuoteFeed()
          this.resetGrid()
          // this.companyCnpj = undefined
        })
        .catch((error) => {
          console.log(error)
        })
    },
    resetGrid () {
      this.showTimer = false
      this.amount = "0"
      this.gridActive = false
      this.quote = JSON.parse(JSON.stringify(this.quoteTemplate))
      this.successOrder = false
      this.cancelledOrder = false
      this.isManualClose = false
      this.rfqCancelEmailEligible = false
      this.rfqCancellationHandled = false
      this.selectedQuote = undefined
      // clearInterval(this.interval)
    },
    openConfirmation (quote) {
      this.showQuoteConfirmationDialog = true
      this.selectedQuote = JSON.parse(JSON.stringify(quote))
      this.confirmedQuoteSnapshot = JSON.parse(JSON.stringify(this.quote))
      this.addBankToleranceToTimer(quote)
      const expirationData = this.getQuoteExpirationTime(quote)
      this.quoteExpirationTime = expirationData.formatted
    },
    async setExpirationDate(){
      if (this.userRole === 'partner')
      {
       const broker = await this.getBrokerById(this.brokerId)
       const masterId = broker.data?.partmaster_id
        return this.formatDefaultTimer(masterId)
      }
      else if (this.userRole === 'broker')
      {
        return this.formatDefaultTimer(this.brokerId)
      }
      else return 180000
    },
    toEpochMs (rawValue) {
      if (!rawValue) return null
      if (typeof rawValue === 'number') {
        return rawValue < 1000000000000 ? rawValue * 1000 : rawValue
      }

      const parsed = Date.parse(rawValue)
      return Number.isNaN(parsed) ? null : parsed
    },
    // Keep RFQ timer source-of-truth in one place: backend expiry for bankmanual, fallback otherwise.
    async resolveRfqTimerMs ({ isBankManual = false, approvalResponse = null } = {}) {
      if (!isBankManual) {
        return this.startNewQuoteTimer()
      }

      const backendExpirationAt = this.toEpochMs(approvalResponse?.data?.expires_at)
      if (Number.isFinite(backendExpirationAt)) {
        return this.startNewQuoteTimer(null, backendExpirationAt)
      }

      // Fallback to 3 minutes.
      return this.startNewQuoteTimer(180000)
    },
    // Supports either a duration (ms) or an absolute expiry timestamp (ms).
    async startNewQuoteTimer (expirationMs = null, expirationAt = null) {
      const timerMs = Number.isFinite(expirationMs)
        ? expirationMs
        : await this.setExpirationDate()
      const expiration = Number.isFinite(expirationAt)
        ? expirationAt
        : Date.now() + timerMs
      const remainingMs = Math.max(0, expiration - Date.now())
      //const expiration = this.userRole === 'pro' || this.userRole === 'partner' ? Date.now() + 30000 : Date.now() + this.getDefaultTimerForRFQ
      this.currentQuote = {
        rfq_id: this.rfqId,
        expiration,
        originalExpiration: expiration,
        extended: false
      }
      this.showTimer = true
      this.rfqCancellationHandled = false
      return remainingMs
    },
    cancelCurrentQuote () {
      this.currentQuote = null
      this.showTimer = false
    },
    addBankToleranceToTimer (quote) {
      const bank = this.banklist.find(b => b.id === quote.rfq_venue_id)
      if (!bank || !this.currentQuote) return

      const toleranceMs = bank.timeDue * 1000
      this.currentQuote.expiration += toleranceMs
      this.currentQuote.extended = true
    },
    removeBankToleranceFromTimer () {
      if (this.currentQuote?.extended) {
        this.currentQuote.expiration = this.currentQuote.originalExpiration
        this.currentQuote.extended = false
      }
    },
    clearCurrentTimer () {
      this.currentQuote = null
      this.showTimer = false
    },
    getQuoteExpirationTime (quote) {
      const bank = this.banklist.find(i => i.id === quote.rfq_venue_id)
      if (!bank) return { formatted: '-', timestamp: null }

      const dueTimeSeconds = (quote.rfq_quote_time || 0) + (bank.timeDue || 0)

      const formattedExpiration = this.formatTimeAndDate
        ? this.formatTimeAndDate(dueTimeSeconds)
        : utils.formatTimeAndDate(dueTimeSeconds)

      return {
        formatted: formattedExpiration,
        timestamp: dueTimeSeconds
      }
    },
    onQuoteExpired (rfq_id) {
      const client = this.currentQuote?.clientName || 'Unknown Client'
      this.showSnackbar(
        this.$t('broker.snackBar.quoteExpired1') + client + this.$t('broker.snackBar.quoteExpired2'),
        'attention'
      )

      this.closeDialog()
      this.clearCurrentTimer()
    },
    cancelConfirmation () {
      this.removeBankToleranceFromTimer()
      this.showQuoteConfirmationDialog = false
    },
    closeDialog () {
      this.showTimer = false
      this.showQuoteConfirmationDialog = false
      this.resetGrid()
      this.closeQuoteFeed()
    },
    convertCurrencyToNumber(currencyString) {
      if (typeof currencyString === 'string') {
        return parseFloat(currencyString.replace(/[^0-9.-]+/g,""));
      } else {
        return 0.00
      }
    },
    redirectToProPurchase () {
      const url = '#'
      window.open(url, "_blank")
    },
    getDateYYYYMMDD(daysToAdd) {
      const timeZone = utils.getTimeZone()
      let current = new Date()
      let daysAdded = 0

      while (daysAdded < daysToAdd) {
        current.setDate(current.getDate() + 1)
        const weekday = new Intl.DateTimeFormat('en-US', {
          weekday: 'short',
          timeZone
        }).formatToParts(current).find(p => p.type === 'weekday')?.value

        if (weekday !== 'Sat' && weekday !== 'Sun') {
          daysAdded++
        }
      }

      const { year, month, day } = utils.getDateParts(current)

      return `${year}${month}${day}`
    },
    async generateSHA1Hash(data) {
      const encoder = new TextEncoder()
      const dataBuffer = encoder.encode(JSON.stringify(data))

      const hashBuffer = await crypto.subtle.digest('SHA-1', dataBuffer)

      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
      
      return hashHex
    },
    async makeQuotePayload () {
      let amount = JSON.parse(JSON.stringify(this.amount))
      amount = this.convertCurrencyToNumber(amount)
      const now = new Date().getTime()
      const { year, month, day, hour, minute } = utils.getDateParts(now, true)
      const isoString = `${year}-${month}-${day}T${hour}:${minute}:00`
      const timestamp = new Date(isoString).getTime()
      const twoMoreDays = this.getDateYYYYMMDD(2)

      const toYYYYMMDD = (dateObj) => {
        const y = dateObj.getFullYear()
        const m = String(dateObj.getMonth() + 1).padStart(2, "0")
        const d = String(dateObj.getDate()).padStart(2, "0")
        return `${y}${m}${d}`
      }

      const parseISO = (str) => {
        // str: "2025-11-18"
        const [y, m, d] = str.split("-").map(Number)
        return new Date(y, m - 1, d)
      }

      const previousBusinessDay = (dateObj) => {
        const d = new Date(dateObj)
        d.setDate(d.getDate() - 1)

        if (d.getDay() === 6) {
          d.setDate(d.getDate() - 1)
        }

        if (d.getDay() === 0) {
          d.setDate(d.getDate() - 2)
        }

        return d
      }

      let sett1 = twoMoreDays
      let sett2 = twoMoreDays

      if (this.activeTab === "ndf") {
        const maturityISO = parseISO(this.maturityDate)

        const prevBiz = previousBusinessDay(maturityISO)

        sett2 = toYYYYMMDD(maturityISO)
        sett1 = toYYYYMMDD(prevBiz)
      }

      const payload = {
        "client_id": this.companyCnpj,
        "broker_id": this.brokerId,
        "rfq_security": this.activeTab === "ndf" ? "FXNDF" : "FXSPOT",
        "rfq_symbol": this.ccy + "/BRL",
        "rfq_side": this.side,
        "rfq_orderqty": amount,
        "rfq_orderqty_ccy": this.ccy,
        "rfq_settdate_ccy1": sett1,
        "rfq_settdate_ccy2": sett2,
        "rfq_taker_id": this.companyCnpj,
        "rfq_taker_time": timestamp,
        "rfq_venue_id": this.rfqVenueId, // cnpj,
        "rfq_venue_secret": this.rfqVenueSecret,
        "rfq_text": this.rfqText,
        "rfq_spotsett" : this.settlement || 'd+0'
      }

      this.rfqRequestHash = await this.generateSHA1Hash(payload)
      payload.rfq_request_hash = this.rfqRequestHash
      
      return payload
    },
    showSnackbar (message, color = 'success') {
      this.globalSnackbar.message = message
      this.globalSnackbar.color = color
      this.globalSnackbar.show = true
    },
    loadbankListFromStorage () {
      const stored = localStorage.getItem('banklist')
      if (stored && stored.trim().startsWith('[')) {
        this.banklist = JSON.parse(stored)
      } else {
        this.banklist = []
      }
    },
  }
}
</script>

<style scoped>
.border-right-grid {
  border-right: 1px solid #ffffff1f; /* #212121; */
}
.border-bottom-grid {
  border-bottom: 1px solid #ffffff1f; /* #212121; */
}
::v-deep div.v-radio.disabled.v-radio--is-disabled.theme--dark > div > i {
  color: #303030;
}
.font-size-rate {
  font-size: 22px;
}
.line-height {
  line-height: 26px;
}
.relative-container {
    position: relative;
}
.center-text {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
}

/* @media (max-width: 810px) {
  .responsive {
    flex-direction: column;
  }
  .responsive > :first-child {
    flex-direction: row !important;
  }
} */

.v-input--radio-group__input {
  display: block
}
::v-deep .rfq-blotter-table tbody tr {
  cursor: pointer;
}
</style>
