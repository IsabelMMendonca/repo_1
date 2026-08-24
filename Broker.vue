<template>
  <v-container fluid>
    <!-- METRICS SECTION -->
    <v-row dense>
      <v-col
        v-for="(metric, index) in metrics"
        :key="index"
        cols="6"
        md="3"
      >
        <v-sheet
          class="pa-4 fill-height"
          elevation="1"
          rounded
        >
          <div class="text-h6 mb-2 d-flex align-start">
            {{ metric.label }}
            <div>
              <v-tooltip max-width="250" right v-if="index===3">
                <template v-slot:activator="{on,attrs}">
                  <v-icon class="mb-5 mx-1" style="cursor:pointer" v-on="on" v-bind="attrs" small>mdi-information-outline</v-icon>
                </template>
                <span>{{$t('partner.metrics.revenueExplanation')}}</span>
              </v-tooltip>
       
            </div>
          </div>

          <div
            class="text-h5 font-weight-bold mb-1"
            :class="metric.valueClass"
          >
            {{ metric.formattedValue }}
          </div>

          <div
            v-if="false"
            class="text-h6"
            :class="metric.changeClass"
          >
            {{ metric.formattedChange }}
          </div>
        </v-sheet>
      </v-col>
    </v-row>

    <!-- LIVE QUOTES & TRADING SECTION -->
    <v-row align="stretch">
      <v-col cols="12" md="6" class="pr-1 pt-0">
        <v-card class="d-flex fill-height flex-column">
          <v-card-title>{{ userRole === 'broker' ? this.$t('broker.liveRates.title') : this.$t('partner.liveRates.title') }}</v-card-title>
          <v-divider class="mx-2"></v-divider>
          <v-row>
            <!-- Real-time Rates Table -->
            <v-col cols="12" md="3">
              <v-card flat class="pa-4">
              <h3>{{ this.$t('broker.liveRates.realTime') }}</h3>
              <v-list dense>
                <v-list-item
                  v-for="(rate, index) in formattedRates"
                  :key="index"
                  class="py-2 px-0"
                >
                  <v-list-item-content>
                    <v-row align="center" no-gutters>
                      <v-col cols="6" class="font-weight-medium">
                        {{ rate.pair }}
                      </v-col>
                      <v-col cols="6" class="text-right">
                        <div class="font-weight-bold text-body-1">
                          {{ rate.rate }}
                        </div>
                        <div v-if="false" :class="rate.changeClass" class="text-caption">
                          {{ rate.formattedChange }}
                        </div>
                      </v-col>
                    </v-row>
                  </v-list-item-content>
                </v-list-item>
              </v-list>
              <v-divider class="mb-5"/>
              <!-- Spread -->
              <h3 v-if="isBroker">{{ this.$t('broker.labels.markup') }} 
                {{ this.getSpreadType === 'PIPS' ? this.$t('broker.labels.pips') : this.$t('broker.labels.bps') }}
              </h3>
              <h3 v-else>{{ this.$t('broker.labels.spread') }} 
                {{ this.getSpreadType === 'PIPS' ? this.$t('broker.labels.pips') : this.$t('broker.labels.bps') }}
              </h3>
              <v-select
                :items="formatToBps"
                item-text="text"
                item-value="value"
                v-model="selectedSpread"
                outlined
                dense
                class="mt-2"
                @change="onSpreadChange"
              />
              </v-card>
            </v-col>

            <v-divider vertical inset class="my-6"></v-divider>

            <!-- Quick RFQ & Quick Operation-->
            <v-col cols="12" md="9">
              <v-tabs class="d-flex tabs-class" v-model="tab">
                <v-tab>{{ this.$t('broker.liveRates.quickOperations') }}</v-tab>
                <v-tab>{{ this.$t('broker.liveRates.quickRFQ') }}</v-tab>
              </v-tabs>

              <v-tabs-items class="responsive-height" v-model="tab">
                <v-tab-item>
                  <TheQuickOperation
                  :clients="filterClientToQuickRfq"
                  :list="operationList"
                  :master-email="masterEmail"
                  :broker-email="brokerInfo.email"
                  @delOperation="delOperation($event)"
                  @downloaded="handleDownload"
                  />
                </v-tab-item>
                <v-tab-item>
                  <TheQuickRfq
                  :loadingNewRfq="loadingNewRfq"
                  :scheduleEnabled="scheduleEnabled"
                  :minDate="minDate"
                  :clients="filterClientToQuickRfq"
                  :resetClient="resetClient"
                  :selectedPair="selectedPair"
                  :side-value="side"
                  :product-value="product"
                  :maturity-date-value="maturityDate"
                  :amount="amount"
                  :scheduleTo="scheduleTo"
                  :currencyPairs="currencyPairs"
                  :gridActive="gridActive"
                  :resetRFQAmountKey="resetRFQAmountKey"
                  @pair="selectedPair = $event"
                  @schedule-to="handleScheduleTo"
                  @maturity-change="handleMaturityChange"
                  @side="handleSide"
                  @product="handleProduct"
                  @amount="handleAmount"
                  @handle-client-id="handleClientId"
                  @operation="handleOperationChange"
                  @reset="handleResetClient"
                   />

                <div class="d-flex align-center mx-3 mb-6" style="gap: 8px;">
                <v-btn
                  color="primary"
                  :loading="loadingNewRfq"
                  :disabled="disableQuoteButton"
                  @click="makeQuote()"
                >
                    {{ scheduleEnabled ? $t('broker.buttons.scheduleQuote') : $t('broker.buttons.requestQuote') }}
                </v-btn>
                  <v-tooltip bottom>
                    <template v-slot:activator="{ on, attrs }">
                  <v-btn
                    icon
                    :disabled="loadingNewRfq"
                    @click="resetQuickRFQ()"
                        v-on="on"
                        v-bind="attrs"
                  >
                    <v-icon>mdi-refresh</v-icon>
                  </v-btn>
                    </template>
                    <span>Reset</span>
                  </v-tooltip>
                </div>
                </v-tab-item>
              </v-tabs-items>
            </v-col>
          </v-row>
        </v-card>
      </v-col>

      <!-- ACTIVE RFQS & OPERATIONS -->
      <ActivePositionsPanel
        :active-positions="activePositions"
        :rfq-cards="activePositionsCardsAll"
        :operation-cards="activeOperationsCardsAll"
        :is-broker="isBroker"
        @open-order-log="showOrderLogDialog = true; fetchIntradayOrderList()"
        @reconcileSubmit="reconcileSubmit"
        @cancel="cancelScheduledQuote"
      />
    </v-row>

    <!-- ORDER LOG DIALOG -->
    <OrderLogDialog
      v-model="showOrderLogDialog"
      :items="rfqElements"
      :loading="loadingOrderLog"
      :is-broker="isBroker"
    />

    <!-- CLIENT PORTFOLIO -->
    <v-row>
      <v-col>
        <v-card>
          <!-- Table Header -->
          <div class="d-flex align-center">
            <v-card-title>
              <v-icon class="mr-2 mb-1">mdi-briefcase</v-icon>
              {{ $t('broker.clientPortfolio.title') }}
            </v-card-title>
            <v-btn
              small
              color="primary"
              @click="showFullPortfolioDialog = true"
            >
              {{ $t('broker.buttons.portfolio') }}
            </v-btn>
            <v-spacer/>
            <v-btn
              small
              color="primary"
              class="mr-2"
              @click="showAddClientDialog = true"
            >
            {{ $t('broker.buttons.addClient') }}
            </v-btn>
            <v-btn
              small
              class="mr-2"
              disabled
            >
            {{ $t('broker.buttons.bulkActions') }}
            </v-btn>
            <v-btn 
              small
              class="mr-2"
              disabled
            >
            {{ $t('instructions.export') }}
            </v-btn>
            <v-btn
              small
              class="mr-2"
              disabled
            >
              <v-icon>mdi-download</v-icon>
            </v-btn>
            <v-btn
              small
              class="mr-2"
              disabled
            >
              <v-icon>mdi-upload</v-icon>
            </v-btn>
          </div>

          <!-- Clients data table -->
          <ClientPortfolioTable
            :headers="porfolioHeaders"
            :items="formattedClients"
            :full="false"
            :is-broker="isBroker"
            :is-partner="isPartner"
            :loading-button="loadingButton"
            @edit-client="editClient"
            @toggle-client-status="({ id, newStatus }) => toggleClientStatus(id, newStatus)"
            @open-delete-dialog="openDeleteDialog"
            @documentation-download="documentationDownloadAndUpload"
          />
        </v-card>
      </v-col>
    </v-row>

    <!-- QUOTEGRID DIALOG -->
    <v-dialog
      v-model="showQuoteGridDialog"
      persistent
      max-width="1000"
      overlay-opacity="0.59"  
    >
      <v-card class="pa-6">
        <div class="d-flex justify-end">
          <v-btn icon @click="showQuoteGridDialog = false; declineQuote()">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>
        <div
          v-if="showTimer || loadingNewRfq"
          class="mt-4 mb-2"
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
          :amount="amount"
          :isBroker="isBroker"
          :quote="quote"
          :quoteList="quoteList"
          :bankList="selectedClient.banklist"
          :gridActive="gridActive"
          :disableGrid="disableGrid"
          :bestRate="bestRate"
          :selectedSpread="selectedSpread"
          @openConfirmation="openConfirmation"
          @declineQuote="declineQuote"
        />
      </v-card>
    </v-dialog>

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
      :amount="amount"
      :selected-quote="selectedQuote"
      :quote-expiration-time="quoteExpirationTime"
      :show-send-quote-button="true"
      :send-quote-button-loading="sendingApprovalEmail"
      :send-quote-button-disabled="currentQuoteForTimer?.expired"
      :format-time-and-date="formatTimeAndDate"
      :rfq-list="rfqList"
      @confirm="makeOrder"
      @cancel="cancelConfirmation"
      @close="closeDialog"
      @upload-files="handleUploadModal"
      @timeDue="declineQuote('timer_expired')"
    >
      <template #summary-extra>
        <p class="font-title" :style="{ '--news-font-size': getFontSize * '12' + 'px' }">{{ $t('broker.dialogs.client') }}: {{ selectedClient.companyName }}</p>
      </template>

      <template #success-extra>
        <h4 class="mt-4">{{ $t('broker.dialogs.checkOrderLog') }}</h4>
      </template>
    </QuoteConfirmationDialog>

    <!--Upload files RFQ DIALOG-->
    <UploadFilesRFQ 
      :operationList="operationList"
      v-model="filesUpload"
      :rfqId="rfqId"
      :clientId="uploadClientId"
      :clientEmail="uploadClientEmail"
      :brokerName="brokerInfo.name"
      :brokerCnpj="brokerCnpj"
      @wasFileUploaded="handleFilesUploaded"
    />

    <!--OPERATION LIST DIALOG-->
    <OperationListModal
    :clientId="selectedClientId"
    :list="operationList"
    v-model="showOperationListDialog"
    :loadingOrder="loadingOrder"
    @download-operation="downloadOp"
    @open-grid-modal="handleOpenGridModal"/>

    <!-- FULL CLIENT PORTFOLIO DIALOG -->
    <v-dialog
      v-model="showFullPortfolioDialog"
      max-width="1500"
      overlay-opacity="0.59"
    >
      <v-card
        class="pa-2"
        style="min-height: 700px"
      >
      <div class="d-flex flex-column mx-4 my-4">
        <div class="d-flex">
          <div class="text-h5 font-weight-light mb-10">
            {{ $t('broker.clientPortfolio.title') }}
          </div>
          <v-spacer />
          <v-btn icon @click="showFullPortfolioDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>
        <ClientPortfolioTable
          :headers="porfolioHeaders"
          :items="formattedClients"
          :full="true"
          :is-broker="isBroker"
          :is-partner="isPartner"
          :loading-button="loadingButton"
          @edit-client="editClient"
          @toggle-client-status="({ id, newStatus }) => toggleClientStatus(id, newStatus)"
          @open-delete-dialog="openDeleteDialog"
          @documentation-download="documentationDownloadAndUpload"
        />
      </div>
      </v-card>
    </v-dialog>

    <!-- ADD CLIENT DIALOG -->
    <AddEditClientForm 
    v-model="showAddClientDialog" 
    :is-broker:="isBroker" 
    :is-mock-data-on="isMockDataOn"
    :user-role="userRole"
    :is-editing-client="isEditingClient"
    :loading-creating-client="loadingCreatingClient"
    :white-label-url="whiteLabelUrl"
    :available-banks="availableBanks"
    :max-banks="maxBanks"
    :client-form="clientForm"
    :create-user="createUser"
    :show-bank-select="showBankSelect"
    :link-company-to-partner="linkCompanyToPartner"
    :kyc-files="pendingClientKycFiles"
    @save="handleSaveClient"
    @cancel="cancelAddClient"
    @upload-files="handleKYCUploadFiles"
    />

    <!-- DELETE CLIENT DIALOG -->
    <delete-modal
      v-model="deleteDialog"
      :loading="loadingDelete"
      :title="$t('broker.dialogs.deleteClient1')"
      :message="$t('broker.dialogs.deleteClient2')"
      :item-label="clientToDeleteLabel"
      @confirm="confirmDeleteClient"
    />

    <!-- KYC UPLOAD ERROR MODAL -->
    <v-dialog v-model="kycUploadErrors.show" max-width="600" overlay-opacity="0.59">
      <v-card class="pa-6">
        <div class="d-flex justify-between mb-4">
          <h3 class="text-h6 error--text grow">
            <v-icon small class="mr-2">mdi-alert-circle</v-icon>
            {{ $t('kyc.uploadErrorTitle') }}
          </h3>
          <v-btn icon @click="kycUploadErrors.show = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>
        <div>
          <p class="mb-4">{{ kycUploadErrors.message }}</p>
          <div v-if="kycUploadErrors.files.length" class="mt-4 pa-3"
            style="background-color: rgba(244, 67, 54, 0.06); border-radius: 4px;">
            <p class="font-weight-bold mb-2">{{ $t('kyc.affectedFilesTitle') }}</p>
            <ul class="mb-0">
              <li v-for="(file, idx) in kycUploadErrors.files" :key="idx" class="mb-1">
                {{ file }}
              </li>
            </ul>
          </div>
        </div>
        <div class="d-flex justify-end mt-6">
          <v-btn color="primary" @click="kycUploadErrors.show = false">
            OK
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

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

    <!-- PARTNER SNACKBAR -->
    <v-snackbar
      v-if="isPartner"
      v-model="partnerSnack.show"
      :color="partnerSnack.color"
      timeout="-1"
      bottom
    >
      <div v-html="partnerSnack.message" class="black--text text-center w-100">
      </div>
      <template v-slot:action>
        <v-btn
          color="black"
          outlined
          @click="partnerSnack.show = false"
        >
          OK
        </v-btn>
      </template>
    </v-snackbar>

    <!--input-->
    <input @change="handleDashboardKYCUpload" multiple type="file" ref="documentInput"
                style="display: none; padding:1rem !important" accept=".pdf" />

    <!--rfq dialog-->
    <the-rfq-window 
      v-model="openQuote"
      :fontSize="getFontSize"
      :rfqToManualPrice="rfqToManualPrice"
      @sentQuote="sentQuote($event)"
    />
    <!--KYC modal
    <TheKYCModal v-model="kycModal"/>
    -->

  </v-container>
</template>

<script>
import {
  useAuthStore,
  useExecutionStore,
  useImportFiles,
  useSettingsStore,
  useUploadStore,
  useAdminStore,
  MAX_KYC_FILE_SIZE
} from "../store/index"
import { useInteractionEmailStore } from "@/store/interactions"
import { useFxMarketStore } from "@/store/toolbarStore"
import { mapState, mapActions,mapStores } from "pinia"
import * as utils from "../utils.js"
import convertToCNPJ from "../utils.js"
import BaseTimer from '@/components/BaseTimer.vue'
import QuoteGrid from '@/components/QuoteGrid.vue'
import QuoteConfirmationDialog from '@/components/QuoteConfirmationDialog.vue'
import { ThemeRiverChart } from "echarts/charts"
import UploadFilesRFQ from "@/components/modal/UploadFilesRFQ.vue"
import TheRfqWindow from "@/components/modal/TheRfqWindow.vue"
import TheQuickRfq from "@/components/broker/TheQuickRfq.vue"
import TheQuickOperation from "@/components/broker/TheQuickOperation.vue"
import OperationListModal from "@/components/modal/OperationListModal.vue"
import TheKYCModal from "@/components/modal/TheKYCModal.vue"
import AddEditClientForm from "@/components/broker/AddEditClientForm.vue"
import ActivePositionsPanel from "@/components/broker/ActivePositionsPanel.vue"
import OrderLogDialog from "@/components/broker/OrderLogDialog.vue"
import ClientPortfolioTable from "@/components/broker/ClientPortfolioTable.vue"
import DeleteModal from "@/components/modal/DeleteModal.vue"


export default {
  components: {
    BaseTimer,
    QuoteGrid,
    TheQuickRfq,
    UploadFilesRFQ,
    QuoteConfirmationDialog,
    TheRfqWindow,
    OperationListModal,
    TheQuickOperation,
    TheKYCModal,
    AddEditClientForm,
    ActivePositionsPanel,
    OrderLogDialog,
    ClientPortfolioTable,
    DeleteModal
  },
  data () {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isoTomorrow = new Date(
      tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000
    )
      .toISOString()
      .substring(0, 10);
    const mockOn = useSettingsStore().isMockDataOn

    const DEFAULT_QUICK_RFQ_STATE = {
      selectedPair: 'USD/BRL',
      product: 'SPOT',
      side: 'BUY',
      amount: '1,000.00',
      maturityDate: isoTomorrow,
      selectedClientId: null,
      scheduleEnabled: false,
      scheduleTo: null,
    }
    
    return {
      ...DEFAULT_QUICK_RFQ_STATE,
      loadingDelete: false,
      partnerSnack:{
        show: false,
        color: 'green',
        message: ''
      },
      aml:true,
      linkCompanyToPartner: false,
      partnerSnackQueue: [],
      pausedPartners :new Set(),
      loadingCreatingClient: false,
      rfqManualModalOpen: 0,
      operationList: [],
      tab: null, //quick rfq and operation
      rfqToManualPrice: { 'message': null },
      whiteLabelUrl: 'https://foobar.clearfx.com',
      openQuote:false,
      rfqListDocuments: [],
      filesUpload:false,
      wasFileUploaded: false,
      uploadClientId: null,
      uploadClientEmail: '',
      pendingClientKycFiles: [],
      maxBanks: mockOn ? 4 : 4,
      showBankSelect: true,
      mockOn: mockOn,
      brokerId: null,
      brokerCnpj: null,
      selectedBanks:[],
      partnerById:{},
      brokerInfo: {
        name: '',
        email: '',
        phone: ''
      },
      banklist: [],
      // metrics
      metricsData: {
        totalTransactedVolume: {
          value: 0,
          change: 0
        },
        dailyAverageVolume: {
          value: 0,
          change: 0
        },
        monthlyRevenue: {
          value: 0,
          change: 0
        }
      },
      // active positions
      activePositions: {
        volume: 0,
        revenue: 0,
        fees: 0
      },
      loadingOrderLog: false,
      // live rates
      liveRates: { usd: null, eur: null, gbp: null },
      // quick rfq schedule
      scheduledQuotes: [],
      // v-dialogs
      showQuoteGridDialog: false,
      kycFiles: { docs: [], id: '' },
      showQuoteConfirmationDialog: false,
      operationAlias :null,
      showOrderLogDialog: false,
      showOperationListDialog:false,
      showFullPortfolioDialog: false,
      showAddClientDialog: false,
      // rfqs properties
      quote: undefined,
      ccy: 'USD',
      settlement: useSettingsStore().defaultSettlement,
      rfqId: undefined,
      rfqVenueId: "43633296000190",
      rfqVenueSecret: "IR73iLHhwL",
      rfqText: "REMESSA",
      rfqRequestHash: undefined,
      rfqCancelEmailEligible: false,
      rfqCancellationHandled: false,
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
      wasLoadedOnce:false,
      suppressPartnerSnackOnce: false,
      rfqList: [],
      loadingNewRfq: false,
      gridActive: false,
      loadingOrder: false,
      retryCount: 0,
      selectedQuote: undefined,
      successOrder: false,
      cancelledOrder: false,
      eventSource: undefined,
      isManualClose: false,
      // timer
      showTimer: false,
      quoteExpirationTime: null,
      activeQuotes: [],
      currentQuote: null,
      autoSelectTimer: null,
      initiatorEmail:'',
      // reporting
      confirmedQuoteSnapshot: [],
      // end of TradingView elements
      resetClient: false,
      selectedSpread: undefined,
      resetRFQAmountKey: 0,
      deleteDialog: false,
      clientIdToDelete: null,
      globalSnackbar: {
        show: false,
        message: '',
        color: 'success'
      },
      kycModal:false,
      isEditingClient: false,
      editingClientId: null,
      clientForm: {
        companyName: '',
        companyRepresentative: '',
        partnerCnpj:'',
        email: '',
        phone: '',
        cnpj: '',
        status: this.$t('broker.status.active'),
        banklist: [],
        transactedVolume: null,
        revenue: null,
        lastTrade: '',
      },
      createUser: false,
      clients: [],
      banksMenuOpen: false,
      sendingApprovalEmail: false,
      // creatingUser: false,
      passwd: 'client@123',
      blocked:0,
      kycUploadErrors: { show: false, files: [], message: '' },
      selectedCompanyId: null,
      loadingButton: null,
      masterId: null,
      masterEmail: null,
      clientWasAdded:false, 
      snackSource: null, //can be toggle, poll or create
      pendingOpenRfqFromRoute: null,
      openingRfqFromRoute: false,
      DEFAULT_QUICK_RFQ_STATE, // for later use in resetQuickRFQ()
    }
  },
    mounted () {
      const brokerId = localStorage.getItem('brokerId')
      this.brokerId = brokerId
      // this.getLiveRates()
      //   .then(response => {
      //     const value = response.data
      //     this.liveRates = value
      //   })
      //   .catch(error => {
      //     console.log(error)
      //   })
      this.executionStore.selectedId = null;
      this.getFxMarketQuote('USD/BRL')
        .then(response => {
          const value = response.data
          this.liveRates.usd = value
        })
        .catch(error => {
          console.log(error)
        })
      this.getFxMarketQuote('EUR/BRL')
        .then(response => {
          const value = response.data
          this.liveRates.eur = value
        })
        .catch(error => {
          console.log(error)
        })
      this.getFxMarketQuote('GBP/BRL')
        .then(response => {
          const value = response.data
          this.liveRates.gbp = value
        })
        .catch(error => {
          console.log(error)
        })
      this.fetchOperationIdList()
      this.statsInterval = setInterval(() => {
        this.getFxMarketQuote('USD/BRL')
          .then(response => {
            const value = response.data
            this.liveRates.usd = value
          })
          .catch(error => {
            console.log(error)
          })
        this.getFxMarketQuote('EUR/BRL')
          .then(response => {
            const value = response.data
            this.liveRates.eur = value
          })
          .catch(error => {
            console.log(error)
          })
        this.getFxMarketQuote('GBP/BRL')
          .then(response => {
            const value = response.data
            this.liveRates.gbp = value
          })
          .catch(error => {
            console.log(error)
          })
        this.getBrokerStats(this.brokerCnpj)
          .then(response => {
            const value = response.data
            this.metricsData.totalTransactedVolume = value.totalTransactedVolume
            this.metricsData.dailyAverageVolume = value.dailyAverageVolume
            this.activePositions = value.activePositions
            this.metricsData.monthlyRevenue = value.monthlyRevenue
          })
          .catch(error => {
            console.log(error)
          })
        this.fetchIntradayOrderList()
        this.fetchRfqsManualPrice()
        this.fetchBrokerClients(brokerId)
        this.fetchOperationIdList()
      }, 3000)

      this.fetchBrokerClients(brokerId)
      this.loadBrokerHierarchy(brokerId)
      // this.getBrokerById(brokerId)
      //   .then(response => {
      //     const banks = response.data.banklist.map(b => ({
      //       name: b.name,
      //       id: b.id,
      //       timeDue: b.timeDue
      //     }))
      //     this.brokerCnpj = response.data.cnpj
      //     localStorage.setItem('brokerCnpj', JSON.stringify(this.brokerCnpj))
      //     this.banklist = banks
      //   })
      //   .catch(error => {
      //     console.log(error)
      //   })

      // this.intradayInterval = setInterval(() => {
      //   this.fetchIntradayOrderList()
      // }, 5000)

      const storedBrokerInfo = localStorage.getItem('brokerUserInfo')
      if (storedBrokerInfo) {
        this.brokerInfo = JSON.parse(storedBrokerInfo)
      }

      //this.queueOpenRfqFromRoute(this.$route?.query?.open_rfq_id)

      if (this.isMockDataOn) {
        this.fetchMockBanks()
        // for demo mode use brokerid = 00
        this.fetchMockBrokerClients("00")
        this.fetchScheduledQuotes()
        this.fetchIntradayOrderList()
        return
      }
    },
  beforeDestroy() {
    clearInterval(this.statsInterval)
    // clearInterval(this.intradayInterval)
  },
  watch: {
    defaultSettlement: {
      immediate: true,
      handler(value) {
        this.settlement = value
      }
    },
    'clientForm.banklist.length'(n) {
      this.showBankSelect = n < this.maxBanks
    },
    'getSpreadType'(val)
    {
      this.selectedSpread = val === 'BPS' ? .5 : 50;
    },
    // clients: {
    //   handler (newVal) {
    //     localStorage.setItem('clients', JSON.stringify(newVal))
    //     if (this.pendingOpenRfqFromRoute) {
    //       this.queueOpenRfqFromRoute(this.pendingOpenRfqFromRoute)
    //     }
    //   },
    //   deep: true
    // },
    // '$route.query.open_rfq_id': {
    //   immediate: true,
    //   handler (rfqId) {
    //     this.queueOpenRfqFromRoute(rfqId)
    //   }
    // },
    selectedPair (val) {
      if (val && val.includes('BRL')) {
        const [first, second] = val.split('/')
        this.ccy = first === 'BRL' ? second : first
      } else {
        this.ccy = ''
      }
    },
    showAddClientDialog (newVal, oldVal) {
      if (!newVal && oldVal) {
        this.cancelAddClient()
      }
    }
  },
  computed: {
    clientToDeleteLabel () {
      const client = this.clients.find(item => item.id === this.clientIdToDelete)
      return client?.companyName || client?.name || ''
    },
    //portfolio header
    porfolioHeaders() {
      const baseHeaders = [
        { text: '', value: 'data-table-select' },
        { text:'', value: 'is_partner', sortable:false, width:'1vw' },
        { text: this.$t('broker.clientPortfolio.headers.client'), value: 'companyName', width:'12vw'},
        { text: this.$t('broker.clientPortfolio.headers.cnpj'), value: 'cnpj' },
        { text: this.$t('broker.clientPortfolio.headers.status'), value: 'status' },
        { text: this.$t('broker.clientPortfolio.headers.timecreate'), value: 'timecreate', sort: this.compareTimeCreate },
        { text: this.$t('broker.clientPortfolio.headers.volume'), value: 'transactedVolume' },
        { text: this.$t('broker.clientPortfolio.headers.lastTrade'), value: 'lastTrade'},
        { text: this.$t('broker.clientPortfolio.headers.revenue'), value: 'revenue' },
        { text: this.$t('broker.clientPortfolio.headers.actions'), value: 'actions', sortable: false, width:'15vw' },
      ]

        if(this.isBroker)
        {
          baseHeaders.splice(4, 0,  {text:'Partner', value: 'partnername' })
        }
      return baseHeaders
    }
      ,
    // TradingView computed
    ...mapState(useSettingsStore, [
      "isMockDataOn",
      "getSpreadType",
      "getDefaultTimerForRFQ",
      "defaultSettlement"
    ]),
    ...mapStores(useExecutionStore),
    ...mapStores(useInteractionEmailStore),
    ...mapStores(useUploadStore),
    ...mapStores(useSettingsStore),
    filterClientToQuickRfq() {
      return this.clientToQuickRfqFilter(this.clients)
    },
    isBroker () {
      return this.userRole === 'broker'
    },
    isPartner(){
      return this.userRole === 'partner'
    },
    locale() {
      const savedLocale = localStorage.getItem("userLanguage");
      return savedLocale || "en";
    },
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
    formatToBps() 
    {
      if (this.getSpreadType === 'PIPS') {
        return [50, 100, 150, 200, 250, 300, 350, 400, 450, 500].map(v => ({
          text: v.toString(),
          value: v
        }))
      }

      return [0.25, 0.5, 0.75, 1, 1.25, 1.5].map(v => ({
        text: v.toFixed(2),
        value: v
      }))
    },
    bestRate () {
      let bestRate = null

      if (!this.quoteList || this.quoteList.length === 0) {
        return bestRate
      }

        const isBuy = this.side?.toUpperCase() === 'BUY'

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
    getFontSize(){
      return this.settingsStore.getFontSize;
    },
    rfqElements () {
      const list = Array.isArray(this.rfqList) ? this.rfqList : []

      // const filtered = list.filter(item =>
      //   String(item.rfq_status).toUpperCase() === 'DEAL'
      // )

      return list.map(element => {
        // const confirmationOfUpload = JSON.parse(localStorage.getItem('fileId'))
        const result = {}

        const rfqAmount = this.isMockDataOn ? element.amount : element.rfq_orderqty

        result.rfq_id = element.rfq_id
        result.rfq_ccy = this.isMockDataOn ? element.ccy : element.rfq_ccy
        result.rfq_side = this.isMockDataOn ? element.side : element.rfq_side
        result.rfq_amount = this.formatPrice(rfqAmount)
        result.rfq_px = element.rfq_px || '-'
        result.volume = (element.rfq_px * rfqAmount) || '-'
        result.rfq_spotsett = element.rfq_spotsett ? element.rfq_spotsett.toUpperCase() : this.settlement.toUpperCase()
        result.rfq_deal_time = this.isMockDataOn ? utils.formatTimeAndDate(element.rfq_timestamp) : utils.formatDateAndTimeFromString(element.rfq_timestamp_s)
        
        result.rfq_security = element.rfq_security
        //MATURITY NO MOMENTO É RFQ_SETT_BRL NO MOMENTO 
        result.rfq_maturity = element.rfq_sett_brl
        const bank = this.banklist.find(b => b.id === element.bank_id)
        result.bank_label = bank ? bank.name : '-'
        if (element.bank_id && !bank) {
          console.warn('Orderlog: bank not found for bank_id', element.bank_id, 'in rfq id', element.rfq_id)
        }
        if (this.isMockDataOn) {
          result.bank_label = element.counterparty_name
        }

        let taker_name = '-'
        let clientIdentifier = element.rfq_taker_id || element.client_id
        if (this.isMockDataOn) {
          const client = this.clients.find(c => c.cnpj === element.client_id)
          taker_name = client?.companyName
          clientIdentifier = client?.id || element.client_id
        } else {
          taker_name = element.rfq_taker_name || '-'
        }
        result.client_name = taker_name

        const client = (this.clients || []).find(c => c.id === clientIdentifier || c.cnpj === clientIdentifier)
        const isPartner = client?.is_partner === 1
        const partnerName = isPartner && this.partnerById[client?.broker_id] ? this.partnerById[client.broker_id].name : null

        result.isPartner = isPartner
        result.partnerName = partnerName

        return result
      })
    },
    disableQuoteButton () {
      const amount = this.convertCurrencyToNumber(this.amount)

      return (
        this.gridActive ||
        !this.selectedClientId ||
        !this.selectedPair ||
        !this.selectedSpread ||
        amount === 0.0
      )
    },
    rfqHeaders () {
      return [
        { text: this.$t('broker.client'), value: 'client_name', sortable: false },
        { text: this.$t('quoteInfo.dealTime'), value: 'rfq_deal_time', sortable: false },
        { text: this.$t('quoteInfo.ccy'), value: 'rfq_ccy', sortable: false },
        { text: this.$t('quoteInfo.side'), value: 'rfq_side', sortable: false },
        { text: this.$t('quoteInfo.amount'), value: 'rfq_amount', sortable: false },
        { text: this.$t('quoteInfo.rate'), value: 'rfq_px', sortable: false },
        { text: this.$t('quoteInfo.volumeCcyBrl'), value: 'volume', sortable: false },
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
      const cnpj = (this.selectedClient?.cnpj || "").replace(/\D/g, "")

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
        rfq_taker_id: cnpj,
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
      // const client = this.getClientById (this.selectedClientId)
      // const clientCNPJ = client.cnpj
      return {
        broker_id: this.isMockDataOn ? "00" : this.brokerId,
        client_id: this.selectedClientId,
        rfq_amount: amount,
        rfq_ccy: this.ccy,
        rfq_deal_quoteid: this.selectedQuote?.rfq_quote_id || "-",
        rfq_deal_time: this.selectedQuote?.rfq_quote_time || "-",
        rfq_id: this.rfqId,
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
    // end of  TradingView computed
    metrics () {
      const {
        totalTransactedVolume,
        dailyAverageVolume,
        monthlyRevenue
      } = this.metricsData

     //const activeClientsCount = this.clients?.length || 0
      const activeClientsCount = this.clients.filter(c=>c.status.includes('Active')).length || 0

      return [
        {
          label: this.$t("broker.metrics.totalVolume"),
          formattedValue: this.formatCurrencyBRLCompactAbbr(totalTransactedVolume.value),
          formattedChange: this.formatChangePercent(totalTransactedVolume.change, 1),
          valueClass: 'font-weight-bold',
          changeClass: this.getClassColor(totalTransactedVolume.change)
        },
        {
          label: this.$t("broker.metrics.dailyVolume"),
          formattedValue: this.formatCurrencyBRLCompactAbbr(dailyAverageVolume.value),
          formattedChange: this.formatChangePercent(dailyAverageVolume.change, 1),
          valueClass: 'font-weight-bold',
          changeClass: this.getClassColor(dailyAverageVolume.change)
        },
        {
          label: this.$t("broker.metrics.activeClients"),
          formattedValue: activeClientsCount.toString(),
          formattedChange:
            this.clientsAddedThisWeek > 0 ? this.clientsAddedThisWeek + this.$t("broker.metrics.newClients") : this.$t("broker.metrics.noClients"),
          valueClass: 'font-weight-bold',
          changeClass: 'grey--text text--darken-1'
        },
        {
          label: this.$t("broker.metrics.revenue"),
          formattedValue: this.formatCurrencyBRLCompactSigned(monthlyRevenue.value),
          formattedChange: this.formatChangePercent(monthlyRevenue.change, 1),
          valueClass: [
            'font-weight-bold',
            this.getClassColor(monthlyRevenue.value)
          ],
          changeClass: this.getClassColor(monthlyRevenue.change)
        }
      ]
    },
    minDate () {
      const today = new Date()
      return today.toISOString().substring(0, 10)
    },
    clientsAddedThisWeek () {
      const now = new Date()
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      return this.clients.filter(c => {
        if (!c.createdAt) return false
        return new Date(c.createdAt) >= oneWeekAgo
      }).length
    },
    formattedRates () {
      return Object.values(this.liveRates)
        .filter(Boolean) // remove nulls
        .map(item => {
          const rateOk = typeof item.rate === 'number'
          return {
            pair: item.pair,
            rate: rateOk ? item.rate.toFixed(4) : '--',
            formattedChange: this.formatChangePercent(item.change || 0, 2),
            changeClass: this.getClassColor(item.change || 0),
          }
        })
    },
    currencyPairs () {
      return Object.values(this.liveRates)
        .filter(Boolean)
        .map(r => ({
          text: r.pair,
          value: r.pair,
          disabled: r.pair !== 'USD/BRL' && r.pair !== 'EUR/BRL'
        }))
    },
    activePositionsCardsAll () {
      const rfqList = Array.isArray(this.rfqList) ? this.rfqList : []
      const scheduled = Array.isArray(this.scheduledQuotes) ? this.scheduledQuotes : []
      // 1) Executed RFQs (source of truth for DEALs)
      const dealIds = new Set(
        rfqList
          .filter(i => String(i.rfq_status || '').toUpperCase() === 'DEAL')
          .map(i => i.rfq_id)
          .filter(Boolean)
      )

      const rfqCards = rfqList
        // .filter(i => String(i.rfq_status || '').toUpperCase() === 'DEAL')
        .map(i => {
          //const bankName = this.bankList.find(bank => bank.id === i.bank_id)
          const bankName = i.rfq_quote?.[i.bank_id]?.bank_name
          let clientName = i.rfq_taker_name
          const clientIdentifier = i.rfq_taker_id || i.client_id
          const client = (this.clients || []).find(c => c.id === clientIdentifier || c.cnpj === clientIdentifier)
          if (this.isMockDataOn) {
            clientName = client?.companyName || '-'
          }
          const isPartner = client?.is_partner === 1
          const partnerName = isPartner && this.partnerById[client?.broker_id] ? this.partnerById[client.broker_id].name : null
          const activeDealOp = (this.operationList || []).filter(op => op.rfqId && String(op.rfqId) === String(i.rfq_id))
          const ts = new Date(i.rfq_timestamp_s || 0).getTime() || 0
          return {
            pair: this.isMockDataOn ? i.ccy : (i.rfq_ccy || i.rfq_symbol),
            amount: this.isMockDataOn ? i.amount : (i.rfq_orderqty ?? i.amount),
            status: (i.rfq_status || this.$t('broker.status.pending')).toUpperCase(),
            client: clientName,
            client_id: clientIdentifier,
            client_cnpj: client?.cnpj || '',
            rfq_px: i.rfq_px,
            rfq_reconcil_sign: i.rfq_reconcil_sign ?? null,
            bank_id:i.bank_id,
            bank_name: bankName ?? '',
            isPartner,
            partnerName,
            activeDealOp,
            time: this.isMockDataOn ? utils.formatTimeAndDate(i.rfq_timestamp) : utils.formatDateAndTimeFromString(i.rfq_timestamp_s),
            rfq_id: i.rfq_id,
            side: i.rfq_side ? i.rfq_side.toUpperCase() : (i.buy ? 'BUY' : i.sell ? 'SELL' : i.side),
            venue: this.isMockDataOn ? i.rfq_venue_id : (i.rfq_venue_id || ''),
            _ts: ts,
            _isDeal: true
          }
        })

      // 2) Scheduled items (skip shadows that duplicate a real DEAL)
      const schedCards = scheduled
        .map(s => {
          const isDeal = String(s.status || '').toUpperCase() === 'DEAL'

          // hard de-dupe: if this scheduled item is already executed in rfqList, skip it
          if (isDeal && (dealIds.has(s.rfq_id) || s.shadowOfRfq)) return null

          // timestamp rule: DEAL -> use s.time (or fallback), otherwise scheduled day at 00:00
          const raw = isDeal
            ? (s.time || s.rfq_timestamp_s)
            : (s.scheduledTime ? `${s.scheduledTime}T00:00:00` : s.time)

          const ts = new Date(raw || 0).getTime() || 0

          let clientName = s.client_name
          if (!clientName && typeof this.getClientNameById === 'function')
            clientName = this.getClientNameById(s.client_id)
          const client = (this.clients || []).find(c => c.id === s.client_id || c.cnpj === s.client_id)
          if (!clientName) {
            clientName = client?.companyName || '-'
          }
          const isPartner = client?.is_partner === 1
          const partnerName = isPartner && this.partnerById[client?.broker_id] ? this.partnerById[client.broker_id].name : null

          return {
            pair: s.rfq_symbol || s.symbol || s.rfq_ccy || s.ccy,
            amount: s.rfq_orderqty ?? s.amount,
            status: (s.status || this.$t('broker.status.pending')).toUpperCase(),
            client: clientName || '-',
            client_id: s.client_id,
            isPartner,
            partnerName,
            time: isDeal
              ? utils.formatDateAndTimeFromString(s.time)
              : utils.formatDateAndTimeFromString(s.scheduledTime),
            rfq_id: s.rfq_id,
            side: s.side,
            venue: s.venue || '',
            _ts: ts,
            _isDeal: isDeal
          }
        })
        .filter(Boolean)

      const merged = [...rfqCards, ...schedCards]

      // 3) Sort: non-DEAL first (earliest first), then DEAL (most recent first)
      return merged.sort((a, b) => {
        if (a._isDeal && !b._isDeal) return 1
        if (!a._isDeal && b._isDeal) return -1
        if (!a._isDeal && !b._isDeal) return a._ts - b._ts
        return b._ts - a._ts
      })
    },
    activeOps () {
      const rfqList = Array.isArray(this.rfqList) ? this.rfqList : []
      const dealIds = new Set(
        rfqList
          .filter(i => String(i.rfq_status || '').toUpperCase() === 'DEAL')
          .map(i => i.rfq_id)
          .filter(Boolean)
      )

      return (this.operationList || []).filter(op => {
        if (!op.rfqId) return true
        return !dealIds.has(op.rfqId)
      })
    },
    activeOperationsCardsAll () {


      return this.activeOps.map(op => {
        const client = (this.clients || []).find(c => c.id === op.companyId || c.cnpj === op.companyId)
        const clientName = client?.companyName || op.companyName || '-'
        const isPartner = client?.is_partner === 1
        const partnerName = isPartner && this.partnerById[client?.broker_id] ? this.partnerById[client.broker_id].name : null

        let formattedTime = '-'
        if (op.timecreate) {
          if (typeof op.timecreate === 'number') {
            formattedTime = utils.formatTimeAndDate(op.timecreate)
          } else {
            formattedTime = utils.formatDateAndTimeFromString(op.timecreate)
          }
        }

        const isAmlApproved = op.amlCheck === true || op.amlCheck === 'true'
        const status = isAmlApproved ? (op.status ? op.status.toUpperCase() : 'PENDING') : 'AML_PENDING'

        return {
          alias: op.alias || '-',
          operationType: op.operationType,
          pair: op.ccy || '-',
          amount: Number(op.qty) || 0,
          status: status,
          client: clientName,
          client_id: op.companyId,
          isPartner,
          partnerName,
          time: formattedTime,
          id: op.id,
          rfq_id: op.rfqId,
          side: op.side ? op.side.toUpperCase() : '',
          _ts: op.timecreate ? new Date(op.timecreate).getTime() : 0,
          _isDeal: false
        }
      }).sort((a, b) => b._ts - a._ts)
    },
    userRole()
    {
      const role = this.getUserRoleFromLocalStorage()
      return role
    },
    availableBanks () {
      if (!Array.isArray(this.banklist)) return []
      if ((this.clientForm.banklist || []).length >= 4) return []
      const chosen = new Set((this.clientForm.banklist || []).map(b => b.name))
      return this.banklist
        .filter(b => b && b.name && !chosen.has(b.name))
        .map(b => ({ id: b.id, name: b.name, limit: Number(b.limit) || 0 }))
    },
    selectedClient () {
      return this.clients.find(c => c.id === this.selectedClientId) || {}
    },
     formattedClients () {
      return this.clients
        .slice()
        .sort((a, b) => {
          const parseDate = (val) => {
            if (!val) return new Date(0)
            if (!isNaN(val)) return new Date(Number(val) * 1000)
            return new Date(val)
          }
          return parseDate(b.lastTrade) - parseDate(a.lastTrade)
        })
        .map( client => {
          let partnerName = this.partnerById[client.broker_id]
          return {
            id: client.id,
            companyName: client.companyName,
            cnpj: convertToCNPJ(client.cnpj),
            timecreate: client.timecreate,
            status: this.translateClientStatus(client.status),
            transactedVolume: this.formatCurrencyBRLCompactAbbr(client.transactedVolume),
            rawTransactedVolume: client.transactedVolume,
            lastTrade: client.lastTrade,
            revenue: this.formatCurrencyBRLCompactSigned(client.revenue),
            rawRevenue: client.revenue,
            is_partner: client.is_partner === 1 ? 'Partner' : "",
            partnername: client.is_partner === 1 ? partnerName?.name : '-',
            kyc: client.kycId
          }
        })
    },
  },
  methods: {
    ...mapActions(useAuthStore, [
      "getUserRoleFromLocalStorage",
      "deleteCompanyUser",
    ]),
    ...mapActions(useExecutionStore, [
      'downloadOperation',
      'putOperationWithRfq',
      'deleteOperation',
      'getOperationIdList',
      'putBroker',
      'getBrokerStats',
      'getCompanyStats',
      'getActivePositions',
      'getLiveRates',
      'getTotalTransactedVolume',
      'getDailyAverageVolume',
      'getCompaniesByBrokerId',
      'deleteCompany',
      'deleteCompanyByFlag',
      'putCompany',
      'createCompany',
      'getBrokerById',
    ]),
    ...mapActions(useAdminStore, [
      "createClientUser",
    ]),
    ...mapActions(useExecutionStore, [
      'getMockBanks',
      'getBrokerClients',
      'saveBrokerClients',
      "convertCurrencyToNumber",
      "getBrokerByCnpj",
      "formatDefaultTimer"
    ]),
    ...mapActions(useFxMarketStore, [
      'getFxMarketQuote',
    ]),
    clientToQuickRfqFilter(clients) {
      if (!Array.isArray(clients)) return []
      return clients.filter(client =>
        !client?.deleted &&
        !(this.userRole === 'broker' && client?.is_partner) &&
        !(client?.role !== 'pro') &&
        !(client?.status === 'Paused')
      )
    },
      async handleDashboardKYCUpload(event) {
        const files = Array.from(event.target.files || [])
        const mode = (event.target?.dataset?.uploadMode) || 'dashboard'
        const companyId = event.target?.dataset?.companyId || null
        // clear dataset so repeated clicks don't reuse stale values
        if (event.target && event.target.dataset) {
          delete event.target.dataset.uploadMode
          delete event.target.dataset.companyId
        }

        if (!files.length) {
          this.loadingButton = null
          return
        }

        this.loadingButton = companyId || this.selectedCompanyId || null

        await this.processKYCFiles(files, { mode, companyId })
      },

      async handleKYCUploadFiles(files) {
        this.pendingClientKycFiles = Array.isArray(files) ? [...files] : []
      },

      async processKYCFiles(files, { mode = 'dashboard', companyId = null } = {}) {
        const result = this.uploadStore.prepareUploadForKYC({
          filesList: files,
          id: this.brokerId,
          minFiles: 0,
        })

        // frontend validation errors: oversized or extra files
        if (!result.ok || (result.extraFiles && result.extraFiles.length) || (result.rejectedOversize && result.rejectedOversize.length)) {
          const parts = []
          const maxSizeMB = utils.bytesToDisplayMB(result.maxSizeBytes || MAX_KYC_FILE_SIZE)

          if (result.rejectedOversize && result.rejectedOversize.length) {
            parts.push(this.$t('kyc.errors.oversize', { size: maxSizeMB }))
          }
          if (result.extraFiles && result.extraFiles.length) {
            parts.push(this.$t('kyc.errors.extraFiles'))
          }

          this.kycUploadErrors = {
            show: true,
            files: [ ...(result.rejectedOversize || []), ...(result.extraFiles || []) ],
            message: parts.join(' ') || this.$t('kyc.errors.generic')
          }

          this.loadingButton = null

          return
        }

        // All good: copy accepted files and proceed to upload
        this.kycFiles = [...this.uploadStore.KYCFiles.docs]
        await this.uploadSelectedFiles(mode, companyId)
      },
    async handleSaveClient({form, edit}){
      if(edit)
      {
        await this.saveClientEdits(form)
      }
      else
      {
        await this.addClient(form)
      }
    },

    async uploadSelectedFiles(mode = 'dashboard', newId = null, filesOverride = null) {
      const files = Array.isArray(filesOverride)
        ? [...filesOverride]
        : (Array.isArray(this.kycFiles) ? [...this.kycFiles] : [])
      const companyId = newId ?? this.selectedCompanyId
      let kycId = null
      const uploadErrors = []

      if (!files.length) {
        if (!filesOverride) {
          this.loadingButton = null
          if (this.$refs.documentInput) {
            // clear transient dataset attributes
            if (this.$refs.documentInput.dataset) {
              delete this.$refs.documentInput.dataset.uploadMode
              delete this.$refs.documentInput.dataset.companyId
            }
            this.$refs.documentInput.value = null
          }
          this.kycFiles = { docs: [], id: '' }
        }
        return
      }

      const toUpload = [...files]
      for (const file of toUpload) {
        try {
          const fileByName = files.find(d => d.name === file?.name)
          if (!fileByName) {
            console.warn('file not found')
            continue
          }

          const normalizeFileName = (s) =>
            String(s ?? "")
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")

          const normalizedName = normalizeFileName(fileByName.name)
          const newFile = new File([fileByName], normalizedName, { type: fileByName.type })

          const response = await this.executionStore.updateKYC(newFile, companyId, this.brokerId, kycId)
          kycId = response.data?.kyc_id
        } catch (fileError) {
          uploadErrors.push({
            filename: file?.name || this.$t('kyc.errors.unknownFile'),
            error: fileError?.message || this.$t('kyc.errors.uploadFailedGeneric')
          })
        }
      }

      // After attempting all, report results
      if (uploadErrors.length > 0) {
        this.kycUploadErrors = {
          show: true,
          files: uploadErrors.map(e => `${e.filename}: ${e.error}`),
          message: this.$t('kyc.errors.uploadFailed', { count: uploadErrors.length })
        }
      } else if (mode === 'dashboard') {
        this.showSnackbar(this.$t('broker.snackBar.filesUploaded'), 'success')
      }

      this.loadingButton = null
      if (this.$refs.documentInput) {
        if (this.$refs.documentInput.dataset) {
          delete this.$refs.documentInput.dataset.uploadMode
          delete this.$refs.documentInput.dataset.companyId
        }
        this.$refs.documentInput.value = null
      }
      this.kycFiles = { docs: [], id: '' }
    },
    getClientInfo(companyId){
       return this.clients.find(c=>c.id === companyId)
    },
   async documentationDownloadAndUpload(item){
    // FIXME: If the user ever starts two actions at once, the loading button will only be the last one.
    // Need to refactor to handle simultaneous loading states properly.
    this.loadingButton = item.id
    this.selectedCompanyId = item.id
    const client = this.getClientInfo(this.selectedCompanyId)
    const name = client.companyName
    const partner = client?.is_partner

    if(this.isBroker)
      {
        //item.id ->company id
        const zipStore = useImportFiles()
        await zipStore.downloadFiles('kyc', this.selectedCompanyId, name, partner)
        this.loadingButton = null
      }
      else {
        if (this.$refs.documentInput && this.$refs.documentInput.dataset) {
          this.$refs.documentInput.dataset.uploadMode = 'dashboard'
          this.$refs.documentInput.dataset.companyId = item.id
        }
        this.$refs.documentInput.click()
      }
    },
      async loadPartnersNameBasedOnClient (){
        const ids = [...new Set(
          (this.clients || [])
            .filter(c => c.is_partner && c.broker_id)
            .map(c => c.broker_id)
        )];

        const results = await Promise.all(
          ids.map(async (id) => {
            try {
              const res = await this.getBrokerById(id);
              return [id, res.data];
            } catch {
              return [id, null];
            }
          })
        );

        this.partnerById = Object.fromEntries(results);
  },
    downloadOp(id)
    {
      const listOp = [id]
      this.downloadOperation(listOp)
    },
    async updateOperationWithRfq(rfq_id, operation_id){
      try {
        await this.putOperationWithRfq(rfq_id, operation_id)
      } catch (error) {
        console.error(error)
      }
    },
    delOperation(id){
      this.deleteOperation(id)
        .then(() => {
          this.showSnackbar(this.$t('broker.snackBar.operationDeleteSuccess'))
        })
        .catch(error => {
          console.log(error)
          this.showSnackbar(this.$t('broker.snackBar.operationDeleteError'), 'error')
        })
    },
    handleDownload(e)
    {
      if(e)
      {
        this.showSnackbar(this.$t('broker.snackBar.operationDownloadSuccess'))
      }
    },
    onSpreadChange(spread) {
      const spreadBps = this.getSpreadType === 'BPS' ? spread : .5
      const spreadPips = this.getSpreadType === 'PIPS' ? spread : 50
      this.putBroker({'spread': spreadPips, 'spread_bps':spreadBps, 'spread_type' : this.getSpreadType}, this.brokerId)
        .then(() => {
          this.showSnackbar(this.$t('broker.snackBar.spreadSuccess'))
        })
        .catch(error => {
          console.log(error)
          this.showSnackbar(this.$t('broker.snackBar.spreadError'), 'error')
        })
    },
    async setExpirationDate(){
      if (this.userRole === 'partner')
      {
        return this.formatDefaultTimer(this.masterId)
      }
      else if (this.userRole === 'broker')
      {
        return this.formatDefaultTimer(this.brokerId)
      }
    },
    async loadBrokerHierarchy(brokerId) {
      try {
        // 1. Check the current broker (it can be a parent or child broker).
        const res = await this.getBrokerById(brokerId)
        const broker = res.data


        if(broker?.whitelabelurl){
          this.whiteLabelUrl = broker.whitelabelurl
        }
        const cnpj = broker.cnpj

        this.brokerCnpj = broker.cnpj
        localStorage.setItem('brokerCnpj', JSON.stringify(this.brokerCnpj))
        const spread_type = broker?.spread_type ?? 'PIPS'
        if (spread_type === 'PIPS') {
          this.selectedSpread = broker?.spread ?? 50
        } else {
          this.selectedSpread = broker?.spread_bps ?? 0.5
        }
        this.settingsStore.setSpreadType(spread_type, this.selectedSpread)

        let parentId = broker.partmaster_id


        this.masterId = broker.partmaster_id

        // 2. If a broker has a parent check the parent broker.
        let sourceBroker = broker

        if (parentId) {
          this.masterEmail = await this.executionStore.getMasterBrokerEmail(parentId)
        }

        // 3. Always use the parent broker's banklist.
        const banks = (sourceBroker.banklist || []).map(b => ({
          name: b.name,
          id: b.id,
          email: b.email,
          timeDue: b.timeDue,
          isOverride: b.isOverride
        }));

        this.banklist = banks

        // 4 update partner's banklist
        if (parentId) {
          await this.putBroker({'banklist': sourceBroker.banklist}, brokerId)
        }

        // if (this.pendingOpenRfqFromRoute) {
        //   this.queueOpenRfqFromRoute(this.pendingOpenRfqFromRoute)
        // }

      } catch (error) {
        console.log(error)
      }
    },
    formatMaturityDate(date){
      return utils.formatMaturityDate(date)
    },
    syncBankSelectVisibility () {
      const n = Array.isArray(this.clientForm.banklist) ? this.clientForm.banklist.length : 0
      this.showBankSelect = n < this.maxBanks
      if (!this.showBankSelect && this.$refs.bankSelect?.isMenuActive) {
        this.$refs.bankSelect.blur()
      }
    },

    fetchMockBanks () {
      this.getMockBanks()
        .then(response => {
          const banks = response.data.banks.map(b => ({
            name: b.name,
            id: b.id,
            timeDue: b.timeDue,
            email: b.email,
            isOverride:b.isOverride
          }))

          this.banklist = banks
        })
        .catch(error => {
          console.log(error)
        })
    },
    closeSnack() {
      this.partnerSnack.show = false
      this.clientWasAdde = false
      this.$nextTick(() => {
        this.showSnackPartner()
      })
  },
    showSnackPartner(){
      //if(!this.partnerSnack.show) return
      if(!this.snackSource || !this.snackSource.includes('toggle')) return;
      if(this.partnerSnackQueue.length === 0)return
      this.partnerSnack.show=true
      this.partnerSnack.color = 'orange'
      const partner = this.partnerSnackQueue.shift()
      this.partnerSnack.message = `<span>Client <b>${partner.companyName}</b> paused</span>`
    },
    fetchBrokerClients (brokerId) {
      Promise.all([
        this.getCompaniesByBrokerId(brokerId),
        this.getCompanyStats(this.brokerCnpj)
      ])
        .then(([companiesRes, statsRes]) => {
          const raw = companiesRes.data || []
          const statsMap = statsRes.data || {}
          // Merge stats onto each company by id.
          raw.forEach(c => Object.assign(c, statsMap[c.id] || {}))
          this.clients = this.transformBrokerCompaniesToClients(raw)
          localStorage.setItem('clients', JSON.stringify(this.clients))
          if(this.isPartner)
            {
              this.openPartnerSnackBar()
            }
          this.loadPartnersNameBasedOnClient()
        })
        .catch(error => {
          console.log(error)
        })
    },
    openPartnerSnackBar(){
      if (!this.isPartner) return
      if(!this.wasLoadedOnce)
      {
        this.clients.forEach(c=>{
          if(String(c.status).toLowerCase()==='paused'){
            this.pausedPartners.add(c.id)
          }
        })
        this.wasLoadedOnce = true
        return;
      }
      const paused = this.clients.filter(c=>
        c.deleted === 0 
      )
      for(const client of paused)
      {
        const isPaused = String(client.status).trim().toLowerCase() === 'paused'
        const wasPaused = this.pausedPartners.has(client.id)

        if(!wasPaused && isPaused)
        {
          this.snackSource = this.kycModal ? '' : 'toggle'
          this.pausedPartners.add(client.id)
          this.partnerSnackQueue.push(client)
        }
        else if(wasPaused && !isPaused)
        {
          this.pausedPartners.delete(client.id)
        }
      }
      this.showSnackPartner()
    },
    transformBrokerCompaniesToClients(list = []) {
      return list.map(item => {
        const bankArray = Array.isArray(item.banklist)
          ? item.banklist
              .filter(b => b && (b.name))
              .map(b => ({
                name: b.name,
                limit: Number(b.limit) || 0,
                email: b?.email || '',
                isOverride: b.isOverride || null,
                id: b.id
              }))
          : []
        const user = item.user || {}
        return {
          role: user.role || "",
          deleted: item.deleted || 0,
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
          is_partner:item.is_partner,
          phone: "",
          userId: user.id,
          kycId: item.kyc_id,
          companyRepresentative: user.name || ""
        }
      })
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
    fetchMockBrokerClients (brokerId) {
      this.getBrokerClients(brokerId)
        .then(response => {
          const clients = response.data.clients || []
          this.clients = clients
          localStorage.setItem('clients', JSON.stringify(clients))
        })
        .catch(error => {
          console.log(error)
        })
    },
    getClientNameById (clientId) {
      const client = this.clients.find(c => c.id === clientId)
      return client?.companyName || '–'
    },
    getClientNameByCNPJ (clientCNPJ) {
      const client = this.clients.find(c => c.cnpj === clientCNPJ)
      return client?.companyName || '–'
    },
    getClientById (clientId) {
      const client = this.clients.find(c => c.id === clientId)
      return client
    },
    formatCurrencyBRL (value) {
      return new Intl.NumberFormat('en-US', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value) // or .format(Math.trunc(value)) if no decimals are to be displayed
    },
    formatCurrencyBRLCompact (val) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'BRL',
        notation: 'compact',
        maximumFractionDigits: 1
      }).format(val)
    },
    formatCurrencyBRLCompactAbbr (val) {
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'BRL',
        notation: 'compact',
        maximumFractionDigits: 1
      }).format(val)

      return formatted
        .replace(/\s?mil/i, 'k')
        .replace(/\s?mi/i, 'M')
        .replace(/\s?bi/i, 'B')
    },
    formatCurrencyBRLCompactSigned (val) {
      const abs = Math.abs(val)
      const sign = val >= 0 ? '+' : '-'
      return `${sign}${this.formatCurrencyBRLCompactAbbr(abs)}`
    },
    formatCurrencyUSD (value) {
      const number = Number(value)
      if (isNaN(number)) return '0.00'

      return number.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    },
    formatChangePercent (val, precision = 1) {
      const sign = val >= 0 ? '↑' : '↓'
      const percent = (Math.abs(val) * 100).toFixed(precision).replace(',', '.')
      return `${sign} ${percent}%`
    },
    getClassColor (val) {
      if (val > 0) return 'green--text text--darken-2'
      if (val < 0) return 'red--text text--darken-2'
      return ''
    },
    translateClientStatus (status) {
      const key = status.toLowerCase().replace(/\s+/g, '')
      return this.$t(`broker.status.${key}`)
    },
    // Client Status Color

    handleClientSaveSuccess(){
        this.updateClients(this.isMockDataOn, this.clients, this.brokerId)
        this.selectedClientId = null
        this.clientWasAdded = true
        if(this.isPartner)
        {
          this.kycModal = true;
          this.snackSource = 'create'
        }
        else
        {
          this.showSnackbar(this.$t('broker.snackBar.clientAdded')) 

        }
        this.resetClientForm()
        this.loadingCreatingClient = false
    },

    async findPartnerByCnpj(cnpj){
      let id = ''
      try{
        const response = await this.getBrokerByCnpj(cnpj)
        id = response.data.id
      }
      catch(e)
      {
        this.showSnackbar('Partner not found!', 'attention')
        return 'error'
      }
      return id
    },
    validatingForm(companyName, email, cnpj, partnerId){
      if (!companyName || !email || !cnpj) {
        this.showSnackbar(this.$t('broker.snackBar.addClientWarn1'), 'attention')
        this.loadingCreatingClient = false
        return false
      }

      if (partnerId.includes('error')) {
        this.showSnackbar('Partner not found!', 'attention')
        this.loadingCreatingClient = false
        return false
      }

      if (!companyName || !email || !cnpj) {
        this.showSnackbar(this.$t('broker.snackBar.addClientWarn1'), 'attention')
        this.loadingCreatingClient = false
        return false
      }

      if (cnpj.length < 18) {
        this.showSnackbar(this.$t('broker.snackBar.addClientWarn2'), 'attention')
        this.loadingCreatingClient = false
        return false
      }
      const normalize = v => v?.toString().replace(/\D/g, '')
      const existedCompany = this.clients.find(c => c.cnpj === normalize(cnpj))
      if (existedCompany) {
        this.showSnackbar(this.$t('broker.snackBar.addClientWarn3'), 'attention')
        this.loadingCreatingClient = false
        return false
      }

      const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)

      if (!isValidEmail(email)) {
        this.showSnackbar(`${email} ${this.$t('broker.snackBar.addClientWarn4')}`, 'attention')
        this.loadingCreatingClient = false
        return false
      }

      return true
    },
    async addClient (form) {
      this.loadingCreatingClient = true;
      const companyName = form.companyName?.trim()
      const email = form.email?.trim()
      const cnpj = form.cnpj?.trim()
      const normalize = v => v?.toString().replace(/\D/g, '')

      const partnerCnpj = form.partnerCnpj?.trim()
      const partnerId = partnerCnpj ? await this.findPartnerByCnpj(normalize(partnerCnpj)) : ''
      
      if (!this.validatingForm(companyName, email, cnpj, partnerId)) {
        return
      }

      const pendingFiles = Array.isArray(this.pendingClientKycFiles) ? [...this.pendingClientKycFiles] : []

 

      // const newId = crypto.randomUUID()
      const client = {
        id: form.cnpj.replace(/\D/g, ""), //newId,
        brokerId: "00",
        companyName: form.companyName,
        companyRepresentative: form.companyRepresentative,
        email: form.email,
        cnpj: form.cnpj.replace(/\D/g, ""),
        status: form.status,
        banklist: [...form.banklist],
        transactedVolume: 0,
        revenue: 0,
        createdAt: new Date().toISOString(),
      }

      const banklistFromClient = (form.banklist || []).map(bank => {
        const original = this.banklist.find(b => b.name === bank.name)
        return original
          ? { ...original }
          : {
            name: bank.name,
            id: bank.id || null,
            timeDue: bank.timeDue || null,
            isOverride: bank?.isOverride || null,
            email: bank.email || '',
            limit: bank.limit || 0
          }
      })

      const clientPayload = {
        cnpj: form.cnpj,
        broker: form.partnerCnpj ? partnerId :  this.brokerId,
        name: form.companyName,
        banklist: banklistFromClient,
      }

      //if (this.userRole === 'partner' || this.clientForm.partnerCnpj) {
      //  clientPayload.blocked = 1
      //}

      let companyId = null
      console.debug("Creating new client company", clientPayload.name, "with banklist:", clientPayload.banklist)
      try {
        const response = await this.createCompany(clientPayload)
        if (!response.data || !response.data.id) {
          throw new Error("Invalid response from createCompany: " + JSON.stringify(response))
        }
        companyId = response.data.id
        client.id = response.data.id
      } catch (error) {
        console.error("Error creating client company:", error)
        this.showSnackbar(this.$t('broker.snackBar.addClientError'), 'error')
        // this.showAddClientDialog = false
        this.loadingCreatingClient = false
        return
      }

      try {
        console.debug("Creating client user for company ID:", companyId)
        await this.createClientUser({
            name: form.companyRepresentative,
          email: client.email,
          passwd: this.passwd.trim(),
          company: client.id,
          role: "pro"
        })
        console.debug("Uploading KYC files for company ID:", companyId)
        const validation = this.uploadStore.prepareUploadForKYC({
          filesList: pendingFiles,
          id: companyId,
          minFiles: 0,
        })

        if ((validation.rejectedOversize && validation.rejectedOversize.length) || (validation.extraFiles && validation.extraFiles.length)) {
          const maxSizeMB = utils.bytesToDisplayMB(validation.maxSizeBytes || MAX_KYC_FILE_SIZE)
          const parts = []

          if (validation.rejectedOversize && validation.rejectedOversize.length) {
            parts.push(this.$t('kyc.errors.oversize', { size: maxSizeMB }))
          }
          if (validation.extraFiles && validation.extraFiles.length) {
            parts.push(this.$t('kyc.errors.extraFiles'))
          }

          this.kycUploadErrors = {
            show: true,
            files: [ ...(validation.rejectedOversize || []), ...(validation.extraFiles || []) ],
            message: parts.join(' ') || this.$t('kyc.errors.generic')
          }

          this.loadingCreatingClient = false
          return
        }

        await this.uploadSelectedFiles('form', companyId, pendingFiles)
      } catch (error) {
        console.error("Error creating client user:", error)

        console.info("Deleting partial company due to user creation failure...")
        await this.deleteCompany(companyId)
          .then(() => console.info("Successfully deleted company after user creation failure"))
          .catch(error => console.error("Error deleting company after user creation failure:", error))

        this.showSnackbar(this.$t('broker.snackBar.addClientError'), 'error')
        // this.showAddClientDialog = false
        this.loadingCreatingClient = false
        return
      }

      console.info("Client successfully added with ID:", client.id)
      this.clients.push(client)
      this.handleClientSaveSuccess()
    },
    // Comment method to create user for client already listed
    // createUserAndSendEmail () {
    //   const client = this.clients.find(c => c.id === this.editingClientId)
    //   if (!client) return

    //   this.creatingUser = true
    //   this.clientForm.pendingUser = true
    //   const psw = md5(this.passwd.trim())
    //   this.createClientUser({
    //     name: client.companyName,
    //     email: client.email,
    //     passwd: psw,
    //     company: client.id,
    //     role: "pro"
    //   })
    //   .then(() => {
    //     client.pendingUser = true
    //     this.updateClients()
    //     this.sendEmail({
    //       type: 'login',
    //       brokerEmail: this.brokerInfo.email,
    //       clientEmail: client.email
    //     })
    //     this.showSnackbar(this.$t('broker.snackBar.clientUser'))
    //   })
    //   .catch((error) => {
    //     console.log(error)
    //     this.clientForm.pendingUser = false
    //     if (client) client.pendingUser = false
    //     this.showSnackbar('Failed to create user or send email', 'attention')
    //   })
    //   .finally(() => {
    //     this.creatingUser = false
    //     client.isUser = true
    //   })
    // },
    resetClientForm () {
      this.clientForm = {
        companyName: '',
        partnerCnpj: '',
        email: '',
        cnpj: '',
        status: this.$t('broker.status.active'),
        banklist: [],
        lastTrade: '',
        createdAt: null,
      }
      this.linkCompanyToPartner = false
      this.pendingClientKycFiles = []
      this.editingClientId = null
      this.isEditingClient = false
      this.showAddClientDialog = false
      this.loadingCreatingClient = false
     // this.clientWasAdded = this.isBroker? false : true;
    },
    editClient (item) {
      const client = this.clients.find(c => c.id === item.id)
      if (!client) return

      this.editingClientId = client.id
      this.isEditingClient = true

      const toObj = b => {
        if (!b) return null
        return {
          name: b.name,
          id: b.id,
          timeDue: b.timeDue,
          isOverride: b.isOverride || 'bankauto',
          email: b.email,
          limit: Number(b.limit) || 0
        }
      }

      const srcList = Array.isArray(client.banklist)
        ? client.banklist
        : (client.banklist && typeof client.banklist === 'object'
            ? Object.values(client.banklist)
            : [])

      const banklist = srcList
        .map(toObj)
        .filter(b => b && b.name)
        .map(b => {
          const master = Array.isArray(this.banklist)
            ? this.banklist.find(x => x && x.name === b.name)
            : null

          return master
            ? {
                name: master.name,
                id: master.id != null ? master.id : b.id,
                timeDue: master.timeDue != null ? master.timeDue : b.timeDue,
                isOverride: master.isOverride || null,
                email: master.email,
                limit: Number(b.limit != null ? b.limit : master.limit) || 0
              }
            : b
        })

      this.clientForm = {
        companyName: client.companyName || '',
        companyRepresentative: client.companyRepresentative || '',
        email: client.email || '',
        cnpj: client.cnpj || '',
        status: client.status || '',
        transactedVolume: client.transactedVolume || 0,
        revenue: client.revenue || 0,
        lastTrade: client.lastTrade || null,
        banklist
      }

      this.showAddClientDialog = true
    },
    openDeleteDialog (id) {
      this.clientIdToDelete = id
      this.deleteDialog = true
    },
    async confirmDeleteClient () {
      try {
        const id = this.clientIdToDelete
        const company = this.clients.find(c => c.id === id)
        this.loadingDelete = true
        if (!this.isMockDataOn) {
           await this.deleteCompany(company.id)
          //await this.deleteCompanyByFlag(company.cnpj)
        }
        this.clients = this.clients.filter(client => client.id !== id)
        this.updateClients(this.isMockDataOn, this.clients, this.brokerId)

        this.showSnackbar(this.$t('broker.snackBar.clientDeleted'))
      } catch (error) {
        console.error(error)
        this.showSnackbar(this.$t('broker.snackBar.clientDeleteError'), 'attention')
      } finally {
        this.deleteDialog = false
        this.loadingDelete = false
        this.clientIdToDelete = null
      }
    },
    toggleClientStatus(id, newStatus) {
      const client = this.clients.find((c) => c.id === id);

      if (client) {
        client.status = newStatus;
        this.updateClients(this.isMockDataOn, this.clients, this.brokerId);

        if (!this.isMockDataOn) {
        try {
          //update blocked backend here
          this.blocked = client.status === "Paused" ? 1 : 0;
          this.toggleClientStatusBackEnd(client.id, this.blocked);
        } catch (err) {
          if (err.response && err.response.status === 403) {
            console.log(err.response.data.detail);
            // this.showSnackbar(this.$t("err.response.data.detail") + newStatus);
          }
        }
        }
      }

      this.showSnackbar(this.$t("broker.snackBar.clientStatus") + newStatus);
      this.updateClients(this.isMockDataOn, this.clients, this.brokerId);
    },
    parseCurrency (value) {
      if (typeof value === 'string') {
        return parseFloat(value.replace(/,/g, '')) || 0
      }
      return value
    },
    cancelAddClient () {
      this.resetClientForm()
      this.showAddClientDialog = false
      this.isEditingClient = false
    },
    saveClientEdits (form) {
      const client = this.clients.find(c => c.id === this.editingClientId)
      if (client) {
        client.companyName = form.companyName
        client.companyRepresentative = form.companyRepresentative
        client.email = form.email
        client.cnpj = form.cnpj
        client.status = form.status
        client.transactedVolume = this.parseCurrency(form.transactedVolume)
        client.revenue = form.revenue
        client.banklist = form.banklist || []
        if (!this.isMockDataOn) {
          const banklistFromClient = (form.banklist || []).map(bank => {
            const original = this.banklist.find(b => b.name === bank.name)
            return original
              ? { ...original }
              : {
                  name: bank.name,
                  id: bank.id || null,
                  timeDue: bank.timeDue || null,
                  isOverride: bank.isOverride || null,
                  email: bank.email || null,
                  limit: bank.limit || 0
                }
          })
          const payloadPutCompany = {
            id: this.editingClientId,
            name: form.companyName,
            cnpj: form.cnpj,
            // broker: this.brokerId,
            banklist: banklistFromClient
          }
          this.putCompany(payloadPutCompany)
            .then(() => {})
            .catch(error => {
              console.log('error',error?.message)
            })
        }
        this.updateClients(this.isMockDataOn, this.clients, this.brokerId)
        this.showSnackbar(this.$t('broker.snackBar.clientUpdated'))
        this.cancelAddClient()
      }
    },
    handleUploadModal(id)
    {
      const selectedId = id !== true && id !== false ? id : null
      const selectedClient = this.clients.find(c => c.id === this.selectedClientId) || this.selectedClient || {}

      this.uploadClientId = selectedClient.id || this.selectedClientId || null
      this.uploadClientEmail = String(selectedClient.email || '').trim()

      this.executionStore.setSelectedId(selectedId)
      this.filesUpload = true
      this.showTimer = false
      this.showQuoteConfirmationDialog = false
      this.resetGrid()
      //this.closeQuoteFeed()
    },
    handleOperationChange(val)
    {
      this.operationAlias = val
    },
    handleFilesUploaded(e)
    {
      this.wasFileUploaded = e
      if (e) {
        this.fetchOperationIdList()
      }
    },
    showSnackbar (message, color = 'success') {
      this.globalSnackbar.message = message
      this.globalSnackbar.color = color
      this.globalSnackbar.show = true
    },
    queueOpenRfqFromRoute (rfqIdRaw) {
      const hasQueryKey = Object.prototype.hasOwnProperty.call(this.$route?.query || {}, 'open_rfq_id')
      const rfqId = String(rfqIdRaw || '').trim()

      if (!hasQueryKey) {
        return
      }

      if (!rfqId) {
        this.showSnackbar(this.$t('broker.snackBar.invalidRfqLink'), 'attention')
        this.clearOpenRfqQueryParam()
        return
      }

      this.pendingOpenRfqFromRoute = rfqId
      // Data (clients/rfq list/banks) may still be loading; watchers will retry while pending.
      this.openQuoteGridFromRoute()
    },
    clearOpenRfqQueryParam () {
      const query = { ...this.$route.query }
      if (!Object.prototype.hasOwnProperty.call(query, 'open_rfq_id')) {
        return
      }

      delete query.open_rfq_id
      this.$router.replace({
        path: this.$route.path,
        query
      }).catch(() => {})
    },
    async resolveBanksFromRfqId (rfqId) {
      let rfqEntry = (Array.isArray(this.rfqList) ? this.rfqList : [])
        .find(i => String(i?.rfq_id || '') === String(rfqId))

      if (!rfqEntry) {
        // Deep-link can arrive before intraday list is hydrated; refresh once before falling back.
        await this.fetchIntradayOrderList()
        rfqEntry = (Array.isArray(this.rfqList) ? this.rfqList : [])
          .find(i => String(i?.rfq_id || '') === String(rfqId))
      }

      let selectedBanks = []
      let selectedBanksIds = []
      let resolvedClientId = null

      if (rfqEntry) {
        const takerId = String(rfqEntry.rfq_taker_id || rfqEntry.client_id || '').replace(/\D/g, '')
        const clientFromCnpj = this.clients.find(
          c => String(c?.cnpj || '').replace(/\D/g, '') === takerId
        )
        const clientFromId = this.clients.find(
          c => String(c?.id || '') === String(rfqEntry.client_id || '')
        )

        const matchedClient = clientFromCnpj || clientFromId || null
        if (matchedClient) {
          resolvedClientId = matchedClient.id
          selectedBanks = (matchedClient.banklist || []).map(b => b.name).filter(Boolean)
          selectedBanksIds = (matchedClient.banklist || []).map(b => b.id).filter(Boolean)
        }

        if ((!selectedBanks.length || !selectedBanksIds.length) && rfqEntry.bank_id) {
          const matchedBank = this.banklist.find(b => String(b?.id || '') === String(rfqEntry.bank_id))
          if (matchedBank) {
            selectedBanks = [matchedBank.name]
            selectedBanksIds = [matchedBank.id]
          }
        }
      }

      if ((!selectedBanks.length || !selectedBanksIds.length) && this.selectedClient?.banklist?.length) {
        selectedBanks = this.selectedClient.banklist.map(b => b.name).filter(Boolean)
        selectedBanksIds = this.selectedClient.banklist.map(b => b.id).filter(Boolean)
      }

      return {
        selectedBanks,
        selectedBanksIds,
        resolvedClientId
      }
    },
    async openQuoteGridFromRoute () {
      const rfqId = String(this.pendingOpenRfqFromRoute || '').trim()
      if (!rfqId || this.openingRfqFromRoute) {
        return
      }
      if (!this.isMockDataOn && !this.brokerCnpj) {
        return
      }

      this.openingRfqFromRoute = true

      try {
        const {
          selectedBanks,
          selectedBanksIds,
          resolvedClientId
        } = await this.resolveBanksFromRfqId(rfqId)

        if (resolvedClientId) {
          this.selectedClientId = resolvedClientId
        }

        this.rfqId = rfqId
        this.rfqCancelEmailEligible = false
        this.rfqCancellationHandled = false
        this.showQuoteGridDialog = true
        this.selectedBanks.push(selectedBanks)
        const timerMs = await this.startNewQuoteTimer()
        this.fetchQuoteFeed(rfqId, selectedBanks, selectedBanksIds, timerMs)
      } catch (error) {
        console.log(error)
        this.showSnackbar(this.$t('broker.snackBar.invalidRfqLink'), 'attention')
      } finally {
        this.pendingOpenRfqFromRoute = null
        this.openingRfqFromRoute = false
        // Consume the query param to avoid auto-reopening after manual refresh/navigation.
        this.clearOpenRfqQueryParam()
      }
    },
    // TradingView methods
    ...mapActions(useExecutionStore, [
      "putOverrideQuote",
      "getRfqsManualPrice",
      "getRfqListWithDocument",
      "saveScheduledQuote",
      "overwriteScheduledQuotes",
      "getScheduledQuotes",
      "requestQuote",
      "getQuoteFeed",
      "makeQuoteOrder",
      "cancelQuote",
      "getIntradayOrderList",
      "getMockIntradayOrderList",
      "saveReports",
      "toggleClientStatusBackEnd",
      "updateClients"
    ]),
    ...mapActions(useInteractionEmailStore, [
      "cancelRfq",
      "requestRfqConfirmed",
      "requestRfqPriceRequest"
    ]),
    formatTimeAndDate (timestamp) {
      return utils.formatTimeAndDate(timestamp)
    },
    formatDate (timestamp) {
      return utils.formatDate(timestamp)
    },

    compareTimeCreate(a, b) {
      const parse = (val) => {
        if (!val) return 0
        if (!isNaN(val)) return Number(val)
        const parsed = Date.parse(val)
        return isNaN(parsed) ? 0 : parsed
      }
      return parse(a) - parse(b)
    },
    formatPrice (price) {
      return utils.formatPrice(price)
    },
    async generateSHA1Hash (data) {
      const encoder = new TextEncoder()
      const dataBuffer = encoder.encode(JSON.stringify(data))

      const hashBuffer = await crypto.subtle.digest('SHA-1', dataBuffer)

      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
      
      return hashHex
    },

    handleOpenGridModal(val)
    {
      const handleVal = val
      const operationId = 
        this.operationList.find(op => op.id === handleVal.operationId)?.id ?? null
      this.callGridOrder(operationId)
    },
    async callGridOrder(operationId = null)
    {
      this.loadingNewRfq = true
      this.rfqCancelEmailEligible = false
      this.rfqCancellationHandled = false
      this.retryCount = 0;
      const fullClient = this.selectedClient
      const clientId = fullClient.id

      if (!clientId) {
        this.showSnackbar(this.$t('broker.snackBar.noClient'), 'attention')
        this.loadingNewRfq = false
        return
      }

      if (!fullClient.banklist || fullClient.banklist.length === 0) {
        this.showSnackbar(this.$t('broker.snackBar.noBanks'), 'attention')
        this.editClient(fullClient)
        this.loadingNewRfq = false
        return
      }

      // Use fullClient consistently since it's already validated to have banklist
      const selectedBanks = (fullClient?.banklist || []).map(b => b.name)
      const selectedBanksIds = (fullClient?.banklist || []).map(b => b.id)

      try {
        const payload = await this.makeQuotePayload()
        payload.broker_id = this.isMockDataOn ? "00" : this.brokerId
        if (operationId && payload.rfq_security === "FXSPOT") {
          payload.operation_id = operationId
          this.operationId = operationId
        }

        const response = await this.requestQuote(payload, selectedBanks, selectedBanksIds)
        const data = response.data
        if (data.rfq_status.toUpperCase() === "REJECTED") {
          this.showSnackbar(this.$t('extras.quoteCancelled'), 'attention')
          return
        }
        this.rfqId = data.rfq_id
        if (operationId && data.rfq_security === "FXSPOT") {
          //this.updateOperationWithRfq(this.rfqId, operationId)
        }

        if (this.scheduleTo) {
          this.scheduleQuote(data)
          return
        }
        this.showQuoteGridDialog = true
        const rfqId = this.rfqId
        this.selectedBanks.push(...selectedBanks)


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
        this.fetchQuoteFeed(rfqId, selectedBanks, selectedBanksIds, timerMs)
      } catch (error) {
        const status = error.response ? error.response.status : null;

        if (status === 403 && this.retryCount === 0) {
          this.retryCount++;
          this.showSnackbar(this.$t('extras.companyBlocked'), 'attention')
        } else if (status === 401 && this.retryCount === 0) {
          this.retryCount++;
          setTimeout(() => {
            this.makeQuote();
          }, 2000);
        } else if (status === 404 && this.retryCount === 0) {
          this.retryCount++;
          this.showSnackbar(this.$t('extras.quoteCancelled'), 'attention')
        } else {
          this.showSnackbar(error?.message, 'attention')

          // this.showSnackbar(this.$t('extras.quoteCancelled'), 'attention')
        }
      } finally {
        this.loadingNewRfq = false
      }
    },
    //handling quick rfq
    handleScheduleTo(val)
    {
      this.scheduleTo = val
    },
    handleMaturityChange(val)
    {
      this.maturityDate = val
    },
    handleSide(val)
    {
      this.side = val
    },
    handleProduct(val)
    {
      this.product = val
    },
    handleResetClient(val)
    {
      this.resetClient = val
    },
    handleAmount(val)
    {
      this.amount = val
    },
    handleClientId(v)
    {
      this.selectedClientId = v
      this.resetQuickRFQ({ keep: ['selectedClientId'] })
    },
    async makeQuotePayload () {
      let amount = JSON.parse(JSON.stringify(this.amount))
      amount = this.convertCurrencyToNumber(amount)
      const now = new Date().getTime()
      const { year, month, day, hour, minute } = utils.getDateParts(now, true)
      const isoString = `${year}-${month}-${day}T${hour}:${minute}:00`
      const timestamp = new Date(isoString).getTime()
      const settlementDays = { 'd+0': 0, 'd+1': 1, 'd+2': 2 }[this.settlement] ?? 2
      const settlementDate = this.getDateYYYYMMDD(settlementDays)
      const cnpj = (this.selectedClient?.cnpj || "").replace(/\D/g, "")

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

      let sett1 = settlementDate
      let sett2 = settlementDate

      if (this.product === "NDF") {
        const maturityISO = parseISO(this.maturityDate)

        const prevBiz = previousBusinessDay(maturityISO)

        sett2 = toYYYYMMDD(maturityISO)
        sett1 = toYYYYMMDD(prevBiz)
      }



      const payload = {
        "client_id": cnpj,
        "broker_id": this.brokerId,
        "rfq_security": this.product === "NDF" ? "FXNDF" : "FXSPOT",
        "rfq_symbol": this.selectedPair,
        "rfq_side": this.side,
        "rfq_orderqty": amount,
        "rfq_orderqty_ccy": this.ccy,
        "rfq_settdate_ccy1": sett1,
        "rfq_settdate_ccy2": sett2,
        "rfq_taker_id": cnpj,
        "rfq_taker_time": timestamp,
        "rfq_venue_id": this.isMockDataOn ? this.rfqVenueId : '',
        "rfq_venue_secret": this.rfqVenueSecret,
        "rfq_text": this.rfqText,
        "rfq_spotsett": this.settlement
      }

      this.rfqRequestHash = await this.generateSHA1Hash(payload)
      payload.rfq_request_hash = this.rfqRequestHash
      
      return payload
    },
    scheduleQuote (quote) {
      quote.scheduledTime = this.scheduleTo
      // quote.selected_banks = banks.map(b => b.name.replace(/\s+/g, '').toLowerCase())
      const payload = {
        quote_id: quote.rfq_id,
        client_name: this.selectedClient?.companyName || "-",
        broker_name: this.brokerInfo.name || "ClearfxAI Broker",
        side: this.side,
        amount: this.convertCurrencyToNumber(this.amount),
        ccy: this.ccy,
        timestamp: quote.scheduledTime
      }

      this.saveScheduledQuote(quote)
        .then(() => {
          this.fetchScheduledQuotes()
          this.showSnackbar(this.$t('broker.snackBar.quoteEmail3'))
          this.resetQuickRFQ()
        })
        .catch(() => {
          this.showSnackbar(this.$t('broker.snackBar.scheduleError1') , 'error')
        })
    },
    executeScheduledQuote (deal) {
      //TODO: finish executing function when scheduling
      const now = utils.getCurrentDateAndTime()
      const client = this.getClientById(deal.client_id)
      const selectedBanks = (client.banklist || []).map(b => b.name)
      const selectedBanksId = (client.banklist || []).map(b => b.id)

      this.selectedClientId = client.id
      this.fetchQuoteFeed(deal.rfq_id, selectedBanks, selectedBanksId)
      this.clearAutoSelectTimer()
      this.autoSelectTimer = setTimeout(() => {
        this.autoSelectBestAndOrder(deal)
      }, 500)

      const temp = this.scheduledQuotes.map(item => {
        if (item.rfq_id === deal.rfq_id) {
          return { ...item, time: now }
        }
        return item
      })

      // Persist the removal of the scheduled entry (no shadow DEAL)
      const updatedQuotes = temp.filter(item => item.rfq_id !== deal.rfq_id)

      this.overwriteScheduledQuotes(updatedQuotes)
        .then(() => {
          this.fetchScheduledQuotes()
        })
        .catch(() => {
          this.showSnackbar(this.$t('broker.snackBar.scheduleError2'), 'error')
        })
    },
    clearAutoSelectTimer () {
      if (this.autoSelectTimer) {
        clearTimeout(this.autoSelectTimer)
        this.autoSelectTimer = null
      }
    },
    autoSelectBestAndOrder (deal) {
      const side = deal.side

      const quotes = Array.isArray(this.quote)
        ? this.quote.filter(q => q && q.rfq_venue_id && Number.isFinite(Number(q.rfq_quote_px)))
        : []

      const getPx = q => Number(q.rfq_quote_px)

      const best = quotes.reduce((acc, q) => {
        if (!acc) return q
        return side === 'SELL'
          ? (getPx(q) > getPx(acc) ? q : acc)
          : (getPx(q) < getPx(acc) ? q : acc)
      }, null)

      if (!best) return

      this.confirmedQuoteSnapshot = JSON.parse(JSON.stringify(quotes))
      this.selectedQuote = JSON.parse(JSON.stringify(best))

      if (this.eventSource) {
        this.eventSource.close()
        this.eventSource = null
      }
      const now = new Date()
      const { year, month, day, hour, minute } = utils.getDateParts(now, true)
      const isoString = `${year}-${month}-${day}T${hour}:${minute}:00`
      const timestamp = new Date(isoString).getTime()

      let price = best.rfq_quote_px
      if (best.rfq_quote_px_old) {
        price = best.rfq_quote_px_old
      }
      const payload = {
        rfq_id: deal.rfq_id,
        rfq_venue_id: best.rfq_venue_id,
        rfq_order_quote_id: best.rfq_quote_id,
        rfq_order_px: price,
        rfq_order_time: timestamp,
      }

      this.makeQuoteOrder(payload)
        .then(response => this.handleOrderResponse(response.data))
        .catch(error => console.log(error))
        .finally(() => {
          this.loadingOrder = false
        })
        .then(() => {
          // optional UI updates here
        })
        .catch(() => {
          this.showSnackbar(this.$t('broker.snackBar.scheduleError2'), 'error')
        })
    },
    cancelScheduledQuote (deal) {
      const updatedQuotes = this.scheduledQuotes.filter(item => item.rfq_id !== deal.rfq_id)

      this.overwriteScheduledQuotes(updatedQuotes)
        .then(() => {
          this.fetchScheduledQuotes()
        })
        .catch(() => {
          this.showSnackbar(this.$t('broker.snackBar.scheduleError2'), 'error')
        })
    },

    makeQuote () {
      if(this.product === 'SPOT')
      {
        this.showOperationListDialog=true;
      }
      else
      {
        this.callGridOrder()
      }
      
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

      this.eventSource = this.getQuoteFeed(
        rfqId,
        selectedBanks,
        selectedBanksId,
        (data) => {
          if (String(data.rfq_status).toUpperCase()==="CANCELLED")
          {
            this.closeQuoteFeed();
            this.clearCurrentTimer()
            this.showQuoteGridDialog = false
            this.showQuoteConfirmationDialog = false
            this.showSnackbar(this.$t('extras.quoteCancelled'), 'attention')
            return
          }

            const quoteList = (data?.rfq_quote ?? []).filter(
              q => q.rfq_quote_px !== null
            )

            data.rfq_quote = quoteList
            this.quote = [ 
            {
              rfq_id: data.rfq_id,
              rfq_status: data.rfq_status,
              rfq_cancel_reason : data.rfq_cancel_reason,
              rfq_quote:[...data.rfq_quote]
            }]
          this.gridActive = true
        },
        (error) => {
          const wasManualClose = this.isManualClose
          const shouldShowExpired = this.shouldShowExpiredToast()
          this.cancelledOrder = true
          this.closeDialog()
          console.log('error on fetch quote feed', error?.message)

          if (this.eventSource) {
            this.eventSource.close()
          }

          if (wasManualClose || !shouldShowExpired) {
            this.isManualClose = false
            return
          }

          this.isManualClose = false
          this.showSnackbar(this.$t('extras.quoteExpired'), 'attention')
        },
        timeoutMs
      )
    },
    closeQuoteFeed () {
      if (this.eventSource) {
        this.isManualClose = true
        this.eventSource.close()
      }
    },
    countTradingDays (rfqs) {
      const dates = new Set()

      rfqs.forEach(rfq => {
        if (rfq.rfq_timestamp) {
          const date = new Date(rfq.rfq_timestamp * 1000).toISOString().slice(0, 10)
          dates.add(date)
        }
      })

      return dates.size
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
        .then(response => this.handleOrderResponse(response.data))
        .catch(error => console.log(error))
        .finally(() => {
          this.loadingOrder = false
        })
    },
    async handleOrderResponse (data) {
      if (data.rfq_status.toUpperCase() === "CANCELLED") {
        this.cancelledOrder = true
        return
      }
      // const clientCnpj = this.selectedClient.cnpj
      // const newClients = await this.updateClientLastTrade(clientCnpj, 
      // this.brokerId, this.selectedQuote, this.amount, this.selectedSpread)
      this.updateClients(this.isMockDataOn, this.clients, this.brokerId)
      this.updateOperationWithRfq(this.rfqId, this.operationId)

      // this.clients = newClients
      this.updateClients(this.isMockDataOn, this.clients, this.brokerId)
      this.successOrder = true
      this.fetchIntradayOrderList()
      if (this.isMockDataOn) {
        this.saveReports(this.reports)
      }
      this.showSnackbar(this.$t('broker.snackBar.quoteEmail2'))
      this.sendNewOrderReviewEmail()
      this.resetQuickRFQ()
      this.getBrokerStats(this.brokerCnpj)
    },
    async sendNewOrderReviewEmail () {
      const rfqId = String(this.rfqId || '').trim()
      try {
        await this.requestRfqConfirmed({
          rfqId,
          brokerCnpj: this.brokerCnpj
        })
      } catch (error) {
        console.log('Failed to send new order review email', error)
        this.showSnackbar(this.$t('broker.snackBar.reviewRequestEmailError'), 'attention')
      }
    },
    // This function would prepare and send a "quote confirmed" email via the old email API.
    // We have an entirely new email system now, so this function is now archived.
    /*
    async sendConfirmedQuoteEmail () {
      const quote = this.selectedQuote
      const time = new Date().toISOString()
      // const venueName = this.isMockDataOn ? quote?.counterparty_name : "Banco Fibra"
      const venueName = quote?.bank_name
      const brokerName = this.brokerInfo.name
       
      const res = await this.getOperationIdList()
      const operation = res.data.operations.find(o=>o.id === this.operationId)


      const payload = {
        quote_id: this.rfqId,
        bank_name:this.selectedBanks[0],
        client_name: this.selectedClient?.companyName || "-",
        broker_name: brokerName,
        venue_name: venueName,
        operation_id: this.operationId,
        operation_label:operation.alias,
        operation_purpose:operation.operationType,
        side: this.side,
        rfq_amount: this.convertCurrencyToNumber(this.amount),
        rfq_ccy: this.ccy,
        rate: quote?.rfq_quote_px,
        timestamp: utils.formatDateAndTimeFromString(time, { time: true, iso: true })
      }

      this.sendEmail({
        brokerEmail: this.brokerInfo.email,
        clientEmail: this.selectedClient?.email,
        quoteData: payload,
        mailCase: 'broker_to_client'
      })
      .finally(() => {
        this.showSnackbar(this.$t('broker.snackBar.quoteEmail2'))
      })
    },
    */

    
    // we're not going to use this for a while, but let's keep it here
    // sendQuoteApprovalRequestEmail () {
    //   this.sendingApprovalEmail = true

    //   const quote = this.selectedQuote
    //   const makeOrderPayload = this.makeOrderPayload
    //   const time = new Date().toISOString()

    //   const encodedPayload = encodeURIComponent(
    //     btoa(JSON.stringify(makeOrderPayload))
    //   )

    //   const baseUrl = `${window.location.origin}/grid/quote-approval`

    //   const confirmUrl = `${baseUrl}?action=confirm&payload=${encodedPayload}`
    //   const cancelUrl = `${baseUrl}?action=cancel&payload=${encodedPayload}`

    //   const payload = {
    //     quote_id: this.rfqId,
    //     client_name: this.selectedClient?.companyName || "-",
    //     broker_name: this.brokerInfo.name || "Demo Broker",
    //     venue_name: quote?.rfq_venue_name || quote?.counterparty_name || "-",
    //     side: this.side,
    //     amount: this.convertCurrencyToNumber(this.amount),
    //     ccy: this.ccy,
    //     rate: quote?.rfq_quote_px,
    //     timestamp: utils.formatLongDateFromISO(time, true),
    //     timedue: this.quoteExpirationTime,
    //     confirmUrl,
    //     cancelUrl
    //   }
    //
    //     this.sendEmail({
    //      type: 'approval',
    //        brokerEmail,
    //        clientEmail,
    //        quoteData
    //      })
    //     .finally(() => {
    //       this.sendingApprovalEmail = false
    //       this.showQuoteConfirmationDialog = false
    //       this.resetQuickRFQ()
    //       this.closeDialog()
    //       this.moveQuoteToBackground(quote)
    //       this.showSnackbar(this.$t('broker.snackBar.quoteEmail1'))
    //     })
    // },
    fetchOperationIdList () {
      this.getOperationIdList()
        .then((response) => {
          this.operationList = response.data?.operations ?? []
        })
        .catch((error) => {
          console.log(error)
        })
    },
   async reconcileSubmit(data, completion = {}){
    const result = await utils.submitReconcile(this.executionStore, data)
    if (result.ok) {
      this.showSnackbar(this.$t('broker.snackBar.reconcileSuccess'))
      completion.success?.()
    } else {
      this.showSnackbar(this.$t(`broker.snackBar.${result.key}`), 'error')
      completion.error?.()
    }
    },
    sentQuote (data) {
      if (!data?.rfqId) {
        this.showSnackbar(this.$t('broker.snackBar.quoteManualError') + '-', 'error')
        this.rfqManualModalOpen = 0
        this.openQuote = false
        this.rfqToManualPrice = { 'message': null }
        return
      }
      if (!data.quote)
      {
        this.cancelQuote({rfq_id:data.rfqId, rfq_venue_id:data.bankId, rfq_cancel_time: Date.now(), rfq_cancel_message:'user_closed_modal'})
          .then(() => {
            if (this.rfqCancelEmailEligible && data.rfqId) {
              this.cancelRfq({ rfqId: data.rfqId, reason: 'user_closed_modal' })
                .catch((error) => {
                  console.log(error)
                })
            }
            const cancelledQuote = `${this.$t('broker.snackBar.quoteManualCancelled1')}${data.rfqId}${this.$t('broker.snackBar.quoteManualCancelled2')}`
            this.showSnackbar(cancelledQuote, 'red')
          })
          .catch((error) => {
            this.showSnackbar(this.$t('broker.snackBar.quoteManualError') + data.rfqId, 'error')
            console.log(error)
          })
          .finally(() => {
            this.rfqManualModalOpen = 0
            this.openQuote = false
            this.rfqToManualPrice = { 'message': null }
          })
        return
      }
      this.putOverrideQuote(data.rfqId, data.quote, data.bankId)
        .then(() => {
          this.showSnackbar(this.$t('broker.snackBar.quoteManualSuccess'))
        })
        .catch((error) => {
          this.showSnackbar(this.$t('broker.snackBar.quoteManualError') + data.rfqId, 'error')
          console.log(error)
        })
        .finally(() => {
          this.rfqManualModalOpen = 0
          this.openQuote=false
          this.rfqToManualPrice={ 'message': null }
        })
    },
    fetchRfqsManualPrice () {
      // Demomode does not use this function
      if (this.isMockDataOn) return
      if (this.rfqManualModalOpen !== 0) return

      this.getRfqsManualPrice(this.brokerId)
        .then((response) => {
          if (response.data.message) {
            this.rfqToManualPrice = response.data
            const bank = this.banklist.find(b => b.id === this.rfqToManualPrice.message.bank_id)
            this.rfqToManualPrice.message.bank_name = bank?.name
            this.openQuote=true
            this.rfqManualModalOpen = 1
          }
        })
        .catch((error) => {
          console.log(error)
        })
    },
    fetchIntradayOrderList () {
      this.loadingOrderLog = true
      // this.getRfqListWithDocument()
      //     .then((response) => {
      //       this.rfqListDocuments = response.data.rfq_ids
      //     })
      //     .catch((error) => {
      //       console.log(error)
      //     })
      if (this.isMockDataOn) {
        const brokerId = "00" // use this id to mock
        const payload = {
          count: -1,
          offset: 0,
          rfq_status: "DEAL",
          broker_id: brokerId
        }
        return this.getMockIntradayOrderList(payload)
          .then((response) => {
            const elements = JSON.parse(JSON.stringify(response.data.elements || []))
            elements.forEach(list=>{
              list.rfq_security = list.product
              list.rfq_sett_brl = list.rfq_settdate_ccy2
            })

            this.rfqList = elements             
          })
          .catch((error) => {
            console.log(error)
            this.rfqList = []
          })
          .finally(() => {
            this.loadingOrderLog = false
          })
      } else {
        const brokerCnpj = this.brokerCnpj
        return this.getIntradayOrderList(brokerCnpj)
          .then((response) => {
            const elements = response.data
            this.rfqList = elements
          })
          .catch((error) => {
            console.log(error)
            this.rfqList = []
          })
          .finally(() => {
            this.loadingOrderLog = false
          })
      }
    },
    fetchScheduledQuotes () {
      this.getScheduledQuotes()
        .then(response => {
          this.scheduledQuotes = response.data || []
        })
        .catch(error => {
          console.log(error)
          this.scheduledQuotes = []
        })
    },
    resetQuickRFQ ({ keep = [] } = {}) {

      // This looks ugly but it's just filtering an object by key
      const filteredDefaultState = Object.fromEntries(
        Object.entries(this.DEFAULT_QUICK_RFQ_STATE).filter(([key]) => !keep.includes(key))
      )

      Object.assign(this, filteredDefaultState)
      this.resetRFQAmountKey += 1
      this.resetClient = Object.keys(filteredDefaultState).includes('selectedClientId')
    },
    declineQuote (reason = 'user_cancelled') {
      if (this.rfqCancellationHandled) return
      this.rfqCancellationHandled = true

      const activeQuote = this.quote?.[0]
      const rfqId = this.isMockDataOn
        ? this.rfqId
        : (activeQuote?.rfq_id || this.rfqId)

      this.cancelCurrentQuote()
      this.showQuoteGridDialog = false
      this.showQuoteConfirmationDialog = false
      this.mode='make'
      this.globalSnackbar.show = true
      this.globalSnackbar.message= 'Quote cancelled'
      this.globalSnackbar.color= 'red'
      const now = new Date().getTime()
      const { year, month, day, hour, minute } = utils.getDateParts(now, true)
      const isoString = `${year}-${month}-${day}T${hour}:${minute}:00`
      const timestamp = new Date(isoString).getTime()
      // const cnpj = (this.selectedClient?.cnpj || "").replace(/\D/g, "")
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
        this.closeQuoteFeed()
        this.resetGrid()
        return
      }
      this.cancelQuote(quote)
        .then(() => {
          this.closeQuoteFeed()
          this.resetGrid()
        })
        .catch((error) => {
          console.log(error)
        })
    },
    resetGrid () {
      this.showTimer = false
      this.gridActive = false
      this.quote = JSON.parse(JSON.stringify(this.quoteTemplate))
      this.successOrder = false
      this.cancelledOrder = false
      this.isManualClose = false
      this.rfqCancelEmailEligible = false
      this.rfqCancellationHandled = false
      this.selectedQuote = undefined
    },
    openConfirmation (quote) {
      this.showQuoteConfirmationDialog = true
      this.selectedQuote = JSON.parse(JSON.stringify(quote))
      this.confirmedQuoteSnapshot = JSON.parse(JSON.stringify(this.quote))
      this.showQuoteGridDialog = false
      this.addBankToleranceToTimer(quote)
      const expirationData = this.getQuoteExpirationTime(quote)
      this.quoteExpirationTime = expirationData.formatted
    },
    // Supports either a duration (ms) or an absolute expiry timestamp (ms).
    async startNewQuoteTimer (expirationMs = null, expirationAt = null) {
      const timerMs = Number.isFinite(expirationMs) ? expirationMs : await this.setExpirationDate()
      const expiration = Number.isFinite(expirationAt) ? expirationAt : Date.now() + timerMs
      const remainingMs = Math.max(0, expiration - Date.now())
      //const expiration = Date.now() + await this.setExpirationDate()
      //const expiration = this.userRole === 'partner' ? Date.now() + 30000 : Date.now() + this.getDefaultTimerForRFQ 
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
    moveQuoteToBackground (quote) {
      const timerEntry = {
        rfq_id: quote.rfq_id,
        expiration: this.currentQuote.expiration,
        visible: false,
        expired: false,
        clientName: this.selectedClient?.companyName || null,
        clientId: this.selectedClient?.id || null
      }

      this.activeQuotes.push(timerEntry)
      this.clearCurrentTimer()
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
      const index = this.activeQuotes.findIndex(q => q.rfq_id === rfq_id)
      if (index !== -1) {
        this.activeQuotes[index].expired = true

        const client = this.activeQuotes[index].clientName || 'Unknown Client'
        this.showSnackbar(this.$t('broker.snackBar.quoteExpired1') + client + this.$t('broker.snackBar.quoteExpired2'), 'attention')
      }

      if (this.currentQuote && this.currentQuote.rfq_id === rfq_id) {
        this.clearCurrentTimer()
      }

      this.closeDialog()
      this.showQuoteGridDialog = false
    },
    cancelConfirmation () {
      this.removeBankToleranceFromTimer()
      this.showQuoteConfirmationDialog = false
      this.showQuoteGridDialog = true
    },
    closeDialog () {
      this.showTimer = false
      this.showQuoteConfirmationDialog = false
      this.resetGrid()
      this.closeQuoteFeed()
    },
    redirectToProPurchase () {
      const url = '#'
      window.open(url, "_blank")
    },
    getDateYYYYMMDD (daysToAdd) {
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
    }
  }
}
</script>

<style scoped>
::v-deep(.v-snack--bottom) {
  margin-bottom: 40px !important;
}
::v-deep(.v-slide-group__content)
{
  display:flex;
  gap:2rem;
  min-width: 0;
  flex: 1 1 auto;

}
.v-tabs{
  justify-content: center;
}
.tabs-class
{
  min-width: 0;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding:0;
}
.rfq-wrapper .copy-icon {
  opacity: 0;
  transition: opacity 0.2s ease-in-out;
}
.rfq-wrapper:hover .copy-icon {
  opacity: 1;
}
::v-deep .v-data-footer__select{
  margin: 0 1rem;
  display:none;
}
::v-deep .text-start{
  white-space:nowrap;
}
.font-title{
  font-size: var(--news-font-size) !important;
}
.active-rfqs{
  height:100%;
}
.responsive-height{
  height: calc(60vh * var(--news-font-size)) !important;
}
::v-deep .v-chip .v-chip__content{
  justify-content: center;
  padding: 0 .3rem !important;
}
::v-deep .text-body-1 {
  font-size: 1.2rem !important;
}
</style>
