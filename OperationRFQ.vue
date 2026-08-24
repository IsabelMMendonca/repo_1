<template>
  <div class="d-flex align-stretch flex-column justify-center">
    <operation-card
      v-for="operation in pendingOperations"
      :key="operation.id"
      :operation="operation"
      :selected="Boolean(selectedOperations[operation.id])"
      :newest="operation.id === newestOperationId"
      @update:selected="$emit('selection-change', { id: operation.id, selected: $event })"
      @delete="$emit('delete-operation', $event)"
      @standard-rfq="openStandardRfq"
      @quick-rfq="open"
      @add-files="$emit('add-files', $event)"
    />

    <template v-if="usedOperations.length">
      <div class="text-h6 font-weight-light mt-7 mx-5 mb-2">{{ $t('menus.usedOperations') }}</div>
      <operation-card
        v-for="operation in usedOperations"
        :key="operation.id"
        :operation="operation"
        :selected="Boolean(selectedOperations[operation.id])"
        :newest="operation.id === newestOperationId"
        @update:selected="$emit('selection-change', { id: operation.id, selected: $event })"
        @delete="$emit('delete-operation', $event)"
        @standard-rfq="openStandardRfq"
        @quick-rfq="open"
      />
    </template>

    <v-dialog v-model="showQuickRfqModal" max-width="560" overlay-opacity="0.59">
      <v-card class="pa-5">
        <div class="d-flex justify-space-between align-center mb-2">
          <div class="text-h6">{{ $t('broker.liveRates.quickRFQ') }}</div>
          <v-btn icon @click="closeQuickRfqModal"><v-icon>mdi-close</v-icon></v-btn>
        </div>
        <div class="text-caption operation-rfq__subtle mb-4">
          {{ $t('instructions.linkedToOperation') }}: {{ quickRfqOperationAlias }}
        </div>

        <the-quick-rfq
          :loadingNewRfq="loadingNewRfq"
          :scheduleEnabled="false"
          :minDate="minDate"
          :clients="quickRfqClients"
          :hide-client-select="true"
          :resetClient="false"
          :selectedPair="selectedPair"
          :side-value="side"
          product-value="SPOT"
          :maturity-date-value="maturityDate"
          :amount="amount"
          :scheduleTo="null"
          :currencyPairs="currencyPairs"
          :gridActive="gridActive"
          :resetRFQAmountKey="resetRFQAmountKey"
          @maturity-change="maturityDate = $event"
          @side="side = $event"
          @amount="amount = $event"
          @handle-client-id="() => {}"
          @reset="() => {}"
        />

        <div class="d-flex justify-end mt-2">
          <v-btn color="primary" :loading="loadingNewRfq" :disabled="disableQuoteButton" @click="requestQuoteForOperation">
            {{ $t('broker.buttons.requestQuote') }}
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showQuoteGridDialog" persistent max-width="1000" overlay-opacity="0.59">
      <v-card class="pa-6">
        <div class="d-flex justify-end">
          <v-btn icon @click="showQuoteGridDialog = false; declineQuote()"><v-icon>mdi-close</v-icon></v-btn>
        </div>
        <div v-if="showTimer || loadingNewRfq" class="mt-4 mb-2">
          <base-timer
            v-if="currentQuoteForTimer"
            :timeLimit="currentQuoteForTimer.expiration"
            @timeDue="declineQuote('timer_expired')"
          />
          <div v-else-if="loadingNewRfq" class="d-flex flex-column align-center justify-center py-6 text-center" style="min-height:4.5rem">
            <v-progress-circular indeterminate color="primary" :size="36" :width="4" class="mb-3" />
          </div>
        </div>

        <quote-grid
          :amount="convertCurrencyToNumber(amount)"
          :isBroker="false"
          :quote="quote"
          :quoteList="quoteList"
          :bankList="banklist"
          :gridActive="gridActive"
          :disableGrid="disableGrid"
          :bestRate="bestRate"
          :selectedSpread="brokerSpread"
          @openConfirmation="openConfirmation"
          @declineQuote="declineQuote"
        />
      </v-card>
    </v-dialog>

    <quote-confirmation-dialog
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
      :quote-expiration-time="quoteExpirationTime"
      :format-time-and-date="formatTimeAndDate"
      :rfq-list="rfqList"
      @confirm="makeOrder"
      @cancel="cancelConfirmation"
      @close="closeDialog"
      @timeDue="declineQuote('timer_expired')"
    />

    <v-snackbar v-model="showNoBanks" color="attention" :timeout="5000" bottom>
      <span class="black--text">{{ $t('broker.snackBar.noBanks') }}</span>
    </v-snackbar>

    <v-snackbar v-model="snackbar.show" :timeout="4000" :color="snackbar.color" bottom>
      <div class="black--text text-center w-100">{{ snackbar.message }}</div>
    </v-snackbar>
  </div>
</template>

<script>
import { mapActions, mapState } from 'pinia'
import { useAuthStore, useExecutionStore, useSettingsStore } from '@/store/index'
import { useInteractionEmailStore } from '@/store/interactions'
import * as utils from '@/utils.js'
import TheQuickRfq from '@/components/broker/TheQuickRfq.vue'
import BaseTimer from '@/components/BaseTimer.vue'
import QuoteGrid from '@/components/QuoteGrid.vue'
import QuoteConfirmationDialog from '@/components/QuoteConfirmationDialog.vue'
import OperationCard from '@/components/operations/OperationCard.vue'

const quoteTemplate = () => [{
  rfq_id: '',
  rfq_status: '',
  rfq_cancel_reason: '',
  rfq_quote: [{
    rfq_quote_time: -1,
    rfq_quote_time_s: '-1',
    rfq_quote_px: '-',
    rfq_quote_spread_avg: '-',
    rfq_quote_spread_ptax: '-',
    rfq_quote_fwdpoints: -1,
    rfq_quote_spotrate: -1,
    rfq_quote_exptime: -1,
    rfq_quote_exptime_s: '-1',
    counterparty_name: '-'
  }]
}]

export default {
  name: 'OperationRFQ',
  components: { TheQuickRfq, BaseTimer, QuoteGrid, QuoteConfirmationDialog, OperationCard },
  props: {
    operationList: { type: Array, default: () => [] },
    selectedOperations: { type: Object, default: () => ({}) },
    newestOperationId: { type: [String, Number], default: null }
  },
  data () {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return {
      showQuickRfqModal: false,
      quickRfqOperationId: null,
      selectedPair: 'USD/BRL',
      side: 'BUY',
      amount: '1,000.00',
      maturityDate: new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().substring(0, 10),
      settlement: 'd+0',
      ccy: 'USD',
      resetRFQAmountKey: 0,
      userRole: undefined,
      brokerId: null,
      brokerCnpj: null,
      brokerEmail: '',
      brokerName: '',
      companyId: null,
      companyName: '',
      companyCnpj: undefined,
      companyEmail: '',
      banklist: [],
      brokerSpread: null,
      loadingNewRfq: false,
      gridActive: false,
      showQuoteGridDialog: false,
      showQuoteConfirmationDialog: false,
      showNoBanks: false,
      quote: undefined,
      rfqList: [],
      rfqId: null,
      rfqVenueId: '43633296000190',
      rfqVenueSecret: 'IR73iLHhwL',
      rfqText: 'REMESSA',
      rfqRequestHash: undefined,
      rfqCancelEmailEligible: false,
      rfqCancellationHandled: false,
      loadingOrder: false,
      retryCount: 0,
      selectedQuote: undefined,
      successOrder: false,
      cancelledOrder: false,
      eventSource: undefined,
      isManualClose: false,
      showTimer: false,
      quoteExpirationTime: null,
      currentQuote: null,
      confirmedQuoteSnapshot: [],
      intradayInterval: null,
      snackbar: { show: false, message: '', color: 'success' }
    }
  },
  computed: {
    ...mapState(useSettingsStore, ['isMockDataOn']),
    pendingOperations () {
      return this.operationList.filter(operation => !operation.rfqId)
    },
    usedOperations () {
      return this.operationList.filter(operation => operation.rfqId)
    },
    quickRfqClients () {
      if (!this.companyId) return []
      return [{ id: this.companyId, companyName: this.companyName || this.companyEmail || '-' }]
    },
    quickRfqOperationAlias () {
      const operation = this.operationList.find(item => item.id === this.quickRfqOperationId)
      return operation?.alias || this.quickRfqOperationId
    },
    currencyPairs: () => [{ text: 'USD/BRL', value: 'USD/BRL', disabled: false }, { text: 'EUR/BRL', value: 'EUR/BRL', disabled: false }],
    minDate: () => new Date().toISOString().substring(0, 10),
    currentQuoteForTimer () { return this.currentQuote },
    quoteList () { return this.quote || quoteTemplate() },
    bestRate () {
      if (!this.quoteList?.length || !this.quoteList[0]?.rfq_quote?.length) return null
      const isBuy = this.side?.toUpperCase() === 'BUY'
      const best = this.quoteList[0].rfq_quote.reduce((previous, current) => {
        if (!previous) return current
        return isBuy
          ? (current.rfq_quote_px < previous.rfq_quote_px ? current : previous)
          : (current.rfq_quote_px > previous.rfq_quote_px ? current : previous)
      }, undefined)
      if (best) best.rfq_id = this.quoteList[0]?.rfq_id
      return best
    },
    disableGrid () {
      return !this.gridActive && (this.quote && !this.quote[0].rfq_quote_id)
    },
    disableQuoteButton () {
      return this.gridActive || !this.companyId || this.convertCurrencyToNumber(this.amount) === 0
    },
    makeOrderPayload () {
      const { year, month, day, hour, minute } = utils.getDateParts(new Date(), true)
      const timestamp = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`).getTime()
      const price = this.selectedQuote.rfq_quote_px_old || this.selectedQuote.rfq_quote_px
      return {
        bank_id: this.selectedQuote.bank_id,
        rfq_id: this.rfqId,
        rfq_taker_id: (this.companyCnpj || '').replace(/\D/g, ''),
        rfq_venue_id: this.isMockDataOn ? this.selectedQuote.rfq_venue_id : this.rfqVenueId,
        rfq_venue_secret: this.rfqVenueSecret,
        rfq_order_quote_id: this.selectedQuote.rfq_quote_id,
        rfq_order_px: price,
        rfq_order_time: timestamp,
        rfq_order_hash: this.rfqRequestHash,
        rfq_order_text: this.rfqText
      }
    },
    reports () {
      const snapshot = this.confirmedQuoteSnapshot || []
      return {
        broker_id: this.isMockDataOn ? '00' : this.brokerId,
        client_id: this.companyId,
        rfq_amount: this.convertCurrencyToNumber(JSON.parse(JSON.stringify(this.amount))),
        rfq_ccy: this.ccy,
        rfq_deal_quoteid: this.selectedQuote?.rfq_quote_id || '-',
        rfq_deal_time: this.selectedQuote?.rfq_quote_time || '-',
        rfq_id: this.rfqId,
        rfq_lastquote: {
          quote_list: snapshot[0]?.rfq_quote?.map((quote, index) => ({
            bank_label: quote.counterparty_name || '-',
            quote_bank_rate: quote.rfq_quote_px || '-',
            quote_bank_time: quote.rfq_quote_time && quote.rfq_quote_time !== -1 ? quote.rfq_quote_time : '-',
            quote_bank_timedue: quote.rfq_quote_exptime || '',
            quote_id: quote.rfq_quote_id || String(index + 1),
            spread_avg_spot: quote.rfq_quote_spread_avg || '-',
            spread_ptax: quote.rfq_quote_spread_ptax || '-'
          })) || [],
          rfq_spotsett: this.settlement
        },
        rfq_side: this.side,
        rfq_spotsett: this.settlement
      }
    }
  },
  mounted () {
    this.userRole = localStorage.getItem('userRole')
    this.brokerId = localStorage.getItem('brokerId')
    this.brokerCnpj = JSON.parse(localStorage.getItem('brokerCnpj') || 'null')
    this.companyId = localStorage.getItem('companyId') || null
    this.companyEmail = localStorage.getItem('userEmail')
    this.loadBankListFromStorage()
    this.getBankListViaBrokerOrCompanyId()
    this.getCompanyInfo()
    this.fetchIntradayOrderList()
    this.intradayInterval = setInterval(this.fetchIntradayOrderList, 3000)
    this.resetGrid()
  },
  beforeDestroy () {
    clearInterval(this.intradayInterval)
    this.closeQuoteFeed()
  },
  methods: {
    ...mapActions(useAuthStore, ['getUserByBrokerID']),
    ...mapActions(useExecutionStore, [
      'requestQuote', 'getQuoteFeed', 'makeQuoteOrder', 'cancelQuote',
      'getIntradayOrderList', 'getCompanyById', 'getBrokerById',
      'convertCurrencyToNumber', 'formatDefaultTimer', 'putOperationWithRfq', 'saveReports'
    ]),
    ...mapActions(useInteractionEmailStore, ['cancelRfq', 'requestRfqPriceRequest', 'requestRfqConfirmed']),
    openStandardRfq (operation) {
      if (!operation?.id) return
      this.$router.push({ path: '/grid/trading', query: { operation_id: operation.id } }).catch(() => {})
    },
    open (operation) {
      if (!operation?.id) return
      this.quickRfqOperationId = operation.id
      this.showQuickRfqModal = true
    },
    showSnackbar (message, color = 'success') {
      this.snackbar = { show: true, message, color }
    },
    loadBankListFromStorage () {
      const stored = localStorage.getItem('banklist')
      this.banklist = stored && stored.trim().startsWith('[') ? JSON.parse(stored) : []
    },
    getBankListViaBrokerOrCompanyId () {
      if (!this.brokerId) return
      if (this.userRole !== 'pro') {
        this.getBrokerById(this.brokerId).then(response => {
          this.banklist = response.data?.banklist || []
          this.brokerSpread = response.data.spread_type === 'PIPS' ? response.data.spread : response.data.spread_bps
        }).catch(console.log)
      }
      this.brokerName = localStorage.getItem('brokerName')
      this.getUserByBrokerID(this.brokerId).then(response => {
        this.brokerEmail = response.data.email
      }).catch(console.log)
    },
    getCompanyInfo () {
      if (!this.companyId) return
      this.getCompanyById(this.companyId).then(response => {
        this.companyCnpj = response.data.cnpj
        this.companyName = response.data.name
        this.fetchIntradayOrderList()
      }).catch(console.log)
    },
    fetchIntradayOrderList () {
      if (!this.brokerCnpj || !this.companyCnpj) return
      this.getIntradayOrderList(String(this.brokerCnpj).replace('"', ''), this.companyCnpj)
        .then(response => { this.rfqList = response.data })
        .catch(console.log)
    },
    formatTimeAndDate: utils.formatTimeAndDate,
    closeQuickRfqModal () {
      this.showQuickRfqModal = false
      this.resetQuickRFQ()
    },
    getDateYYYYMMDD (daysToAdd) {
      const timeZone = utils.getTimeZone()
      const current = new Date()
      let daysAdded = 0
      while (daysAdded < daysToAdd) {
        current.setDate(current.getDate() + 1)
        const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone })
          .formatToParts(current).find(part => part.type === 'weekday')?.value
        if (weekday !== 'Sat' && weekday !== 'Sun') daysAdded++
      }
      const { year, month, day } = utils.getDateParts(current)
      return `${year}${month}${day}`
    },
    async generateSHA1Hash (data) {
      const buffer = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(JSON.stringify(data)))
      return Array.from(new Uint8Array(buffer)).map(byte => byte.toString(16).padStart(2, '0')).join('')
    },
    async makeQuotePayload () {
      const amount = this.convertCurrencyToNumber(JSON.parse(JSON.stringify(this.amount)))
      const { year, month, day, hour, minute } = utils.getDateParts(Date.now(), true)
      const timestamp = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`).getTime()
      const settlementDate = this.getDateYYYYMMDD(2)
      const cnpj = (this.companyCnpj || '').replace(/\D/g, '')
      const payload = {
        client_id: cnpj, broker_id: this.brokerId, rfq_security: 'FXSPOT',
        rfq_symbol: this.selectedPair, rfq_side: this.side, rfq_orderqty: amount,
        rfq_orderqty_ccy: this.ccy, rfq_settdate_ccy1: settlementDate,
        rfq_settdate_ccy2: settlementDate, rfq_taker_id: cnpj, rfq_taker_time: timestamp,
        rfq_venue_id: this.isMockDataOn ? this.rfqVenueId : '',
        rfq_venue_secret: this.rfqVenueSecret, rfq_text: this.rfqText, rfq_spotsett: this.settlement
      }
      this.rfqRequestHash = await this.generateSHA1Hash(payload)
      payload.rfq_request_hash = this.rfqRequestHash
      return payload
    },
    async setExpirationDate () {
      if (this.userRole === 'partner') {
        const broker = await this.getBrokerById(this.brokerId)
        return this.formatDefaultTimer(broker.data?.partmaster_id)
      }
      if (this.userRole === 'broker') return this.formatDefaultTimer(this.brokerId)
      return 180000
    },
    toEpochMs (value) {
      if (!value) return null
      if (typeof value === 'number') return value < 1e12 ? value * 1000 : value
      const parsed = Date.parse(value)
      return Number.isNaN(parsed) ? null : parsed
    },
    async resolveRfqTimerMs ({ isBankManual = false, approvalResponse = null } = {}) {
      if (!isBankManual) return this.startNewQuoteTimer()
      const expiration = this.toEpochMs(approvalResponse?.data?.expires_at)
      return Number.isFinite(expiration) ? this.startNewQuoteTimer(null, expiration) : this.startNewQuoteTimer(180000)
    },
    async startNewQuoteTimer (duration = null, expirationAt = null) {
      const timer = Number.isFinite(duration) ? duration : await this.setExpirationDate()
      const expiration = Number.isFinite(expirationAt) ? expirationAt : Date.now() + timer
      this.currentQuote = { rfq_id: this.rfqId, expiration, originalExpiration: expiration, extended: false }
      this.showTimer = true
      this.rfqCancellationHandled = false
      return Math.max(0, expiration - Date.now())
    },
    cancelCurrentQuote () { this.currentQuote = null; this.showTimer = false },
    clearCurrentTimer () { this.currentQuote = null; this.showTimer = false },
    addBankToleranceToTimer (quote) {
      const bank = this.banklist.find(item => item.id === quote.rfq_venue_id)
      if (!bank || !this.currentQuote) return
      this.currentQuote.expiration += bank.timeDue * 1000
      this.currentQuote.extended = true
    },
    removeBankToleranceFromTimer () {
      if (!this.currentQuote?.extended) return
      this.currentQuote.expiration = this.currentQuote.originalExpiration
      this.currentQuote.extended = false
    },
    getQuoteExpirationTime (quote) {
      const bank = this.banklist.find(item => item.id === quote.rfq_venue_id)
      if (!bank) return { formatted: '-', timestamp: null }
      const timestamp = (quote.rfq_quote_time || 0) + (bank.timeDue || 0)
      return { formatted: this.formatTimeAndDate(timestamp), timestamp }
    },
    async requestQuoteForOperation () {
      this.loadingNewRfq = true
      this.rfqCancelEmailEligible = false
      this.rfqCancellationHandled = false
      this.retryCount = 0
      const selectedStoredBanks = () => JSON.parse(localStorage.getItem('banklist') || '[]').filter(bank => bank.selected)
      const banks = this.userRole === 'pro' ? selectedStoredBanks() : this.banklist
      const selectedBanks = banks.map(bank => bank.name)
      const selectedBankIds = banks.map(bank => bank.id)
      if (!selectedBanks.length) {
        this.showNoBanks = true
        this.loadingNewRfq = false
        return
      }
      try {
        const payload = await this.makeQuotePayload()
        payload.operation_id = this.quickRfqOperationId
        const { data } = await this.requestQuote(payload, selectedBanks, selectedBankIds)
        if (String(data.rfq_status).toUpperCase() === 'REJECTED') {
          this.showSnackbar(this.$t('extras.quoteCancelled'), 'attention')
          return
        }
        this.rfqId = data.rfq_id
        this.showQuickRfqModal = false
        this.showQuoteGridDialog = true
        let approvalResponse = null
        try {
          approvalResponse = await this.requestRfqPriceRequest({ rfqId: this.rfqId, brokerCnpj: this.brokerCnpj })
        } catch (error) {
          console.log('Failed to request RFQ email approval', error)
        }
        this.rfqCancelEmailEligible = Boolean(approvalResponse?.data?.email_sent)
        const timer = await this.resolveRfqTimerMs({ isBankManual: this.rfqCancelEmailEligible, approvalResponse })
        this.fetchQuoteFeed(this.rfqId, selectedBanks, selectedBankIds, timer)
      } catch (error) {
        const status = error.response?.status
        if (status === 403) this.showSnackbar(this.$t('extras.companyBlocked'), 'attention')
        else if (status === 401 && this.retryCount === 0) {
          this.retryCount++
          setTimeout(this.requestQuoteForOperation, 2000)
        } else if (status === 404) this.showSnackbar(this.$t('extras.quoteCancelled'), 'attention')
        else this.showSnackbar(error?.message, 'attention')
      } finally {
        this.loadingNewRfq = false
      }
    },
    getQuoteFeedHeartbeatTimeoutMs () {
      const remaining = this.currentQuote?.expiration - Date.now()
      return Number.isFinite(remaining) && remaining > 0 ? Math.max(remaining, 1000) : null
    },
    shouldShowExpiredToast () {
      return Boolean(this.currentQuote?.expiration && Date.now() >= this.currentQuote.expiration)
    },
    fetchQuoteFeed (rfqId, selectedBanks, selectedBankIds, heartbeatTimeout = null) {
      const timeout = Number.isFinite(heartbeatTimeout) ? heartbeatTimeout : this.getQuoteFeedHeartbeatTimeoutMs()
      this.eventSource = this.getQuoteFeed(rfqId, selectedBanks, selectedBankIds, data => {
        if (String(data.rfq_status).toUpperCase() === 'CANCELLED') {
          this.closeQuoteFeed()
          this.clearCurrentTimer()
          this.showQuoteGridDialog = false
          this.showQuoteConfirmationDialog = false
          this.showSnackbar(this.$t('extras.quoteCancelled'), 'attention')
          return
        }

        const quotes = (data?.rfq_quote || []).filter(quote => quote.rfq_quote_px !== null)
        this.quote = [{
          rfq_id: data.rfq_id,
          rfq_status: data.rfq_status,
          rfq_cancel_reason: data.rfq_cancel_reason,
          rfq_quote: this.isMockDataOn ? [...(data.rfq_quote || [])] : quotes
        }]
        this.gridActive = true
      }, error => {
        const manualClose = this.isManualClose
        const expired = this.shouldShowExpiredToast()
        this.cancelledOrder = true
        this.closeDialog()
        console.log('error on fetch quote feed', error?.message)
        if (manualClose || !expired) { this.isManualClose = false; return }
        this.isManualClose = false
        this.showSnackbar(this.$t('extras.quoteExpired'), 'attention')
      }, timeout)
    },
    closeQuoteFeed () {
      if (!this.eventSource) return
      this.isManualClose = true
      this.eventSource.close()
      this.eventSource = undefined
    },
    openConfirmation (quote) {
      this.showQuoteConfirmationDialog = true
      this.selectedQuote = JSON.parse(JSON.stringify(quote))
      this.confirmedQuoteSnapshot = JSON.parse(JSON.stringify(this.quote))
      this.addBankToleranceToTimer(quote)
      this.quoteExpirationTime = this.getQuoteExpirationTime(quote).formatted
    },
    declineQuote (reason = 'user_cancelled') {
      if (this.rfqCancellationHandled) return
      this.rfqCancellationHandled = true
      const activeQuote = this.quote?.[0]
      const rfqId = this.isMockDataOn ? this.rfqId : (activeQuote?.rfq_id || this.rfqId)
      const { year, month, day, hour, minute } = utils.getDateParts(Date.now(), true)
      const payload = {
        rfq_id: rfqId,
        rfq_venue_id: this.rfqVenueId,
        rfq_venue_secret: this.rfqVenueSecret,
        rfq_cancel_time: new Date(`${year}-${month}-${day}T${hour}:${minute}:00`).getTime(),
        rfq_cancel_message: 'Taker manually declined quoted price'
      }
      if (rfqId && this.rfqCancelEmailEligible) this.cancelRfq({ rfqId, reason }).catch(console.log)
      if (!rfqId) { this.cancelCurrentQuote(); this.closeQuoteFeed(); this.resetGrid(); return }
      this.cancelQuote(payload).then(() => {
        this.cancelCurrentQuote(); this.closeQuoteFeed(); this.resetGrid()
      }).catch(console.log)
    },
    resetGrid () {
      this.showTimer = false
      this.showQuoteGridDialog = false
      this.gridActive = false
      this.quote = quoteTemplate()
      this.successOrder = false
      this.cancelledOrder = false
      this.isManualClose = false
      this.rfqCancelEmailEligible = false
      this.rfqCancellationHandled = false
      this.selectedQuote = undefined
    },
    cancelConfirmation () { this.removeBankToleranceFromTimer(); this.showQuoteConfirmationDialog = false },
    closeDialog () { this.showTimer = false; this.showQuoteConfirmationDialog = false; this.resetGrid(); this.closeQuoteFeed() },
    makeOrder () {
      this.clearCurrentTimer()
      this.closeQuoteFeed()
      this.loadingOrder = true
      this.makeQuoteOrder(this.makeOrderPayload)
        .then(response => this.handleOrderResponse(response.data))
        .catch(console.log)
        .finally(() => { this.loadingOrder = false })
    },
    async handleOrderResponse (data) {
      if (String(data.rfq_status).toUpperCase() === 'CANCELLED') { this.cancelledOrder = true; return }
      if (this.quickRfqOperationId) await this.updateOperationWithRfq(this.rfqId, this.quickRfqOperationId)
      this.successOrder = true
      this.fetchIntradayOrderList()
      this.$emit('operation-updated')
      if (this.isMockDataOn) this.saveReports(this.reports).catch(console.log)
      this.showSnackbar(this.$t('broker.snackBar.quoteEmail2'))
      this.sendNewOrderReviewEmail()
      this.resetQuickRfqForm()
    },
    async sendNewOrderReviewEmail () {
      try {
        //await this.requestRfqConfirmed({ rfqId: String(this.rfqId || '').trim(), brokerCnpj: this.brokerCnpj })
      } catch (error) {
        console.log('Failed to send new order review email', error)
        this.showSnackbar(this.$t('broker.snackBar.reviewRequestEmailError'), 'attention')
      }
    },
    async updateOperationWithRfq (rfqId, operationId) {
      try { await this.putOperationWithRfq(rfqId, operationId) } catch (error) { console.error(error) }
    },
    resetQuickRfqForm () {
      this.selectedPair = 'USD/BRL'
      this.side = 'BUY'
      this.amount = '1,000.00'
      this.quickRfqOperationId = null
      this.resetRFQAmountKey++
    },
    resetQuickRFQ () {
      this.resetQuickRfqForm()
      this.resetGrid()
    }
  }
}
</script>

<style scoped>
.operation-rfq__subtle { color: rgb(168, 168, 168); }
</style>
