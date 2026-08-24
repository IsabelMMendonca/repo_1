<template>
  <section class="ma-12">
    <v-card class="rounded-lg">
      <v-tabs v-model="tab">
        <v-tab class="pa-4">
          <span><v-icon left>mdi-handshake-outline</v-icon></span>
          {{$t('management.brokers.title')}}</v-tab
        >
        <v-tab v-if="isRootBroker" class="pa-4">
          <span><v-icon left>mdi-bank-outline</v-icon></span> {{$t('management.banks.title')}}</v-tab
        >
        <v-tab class="pa-4">
          <span><v-icon left>mdi-domain</v-icon></span> {{$t('management.companies.title')}}</v-tab
        >
        <v-tab class="pa-4">
          <span><v-icon left>mdi-account-outline</v-icon></span> {{$t('management.users.title')}}</v-tab
        >
      </v-tabs>
    </v-card>
    <v-tabs-items v-model="tab">
      <!--broker-->
      <v-tab-item>
        <management-table 
          :title="$t('management.brokers.title')" 
          :subtitle="$t('management.brokers.subtitle')" 
          :cta="$t('management.brokers.addBroker')"
          :cta2="$t('management.brokers.exportBroker')"
          :loading="loadingTable"
          :headers="brokerHeader"
          :items="brokerElements"
          :is-broker="true"
          type="broker"
          @toggle-override="toggleOverride"
          @confirm-delete="openDeleteModal"
          @add="addBrokerOrBank"
          @update="({item, action, id}) => updateBroker(item, action, id)"
          @delete="({item,type})=> openDeleteModal(item,type)"
          @export="exportBrokers"

          >
        <!-- Time Created with browser tooltip -->
        <template v-slot:item.raw_timecreate="{ item }">
          <date-time-layout :timestamp="item.raw_timecreate" />
        </template>

        <!-- First Login with browser tooltip -->
        <template v-slot:item.raw_first_login="{ item }">
          <date-time-layout :timestamp="item.raw_first_login" />
        </template>

        <!-- PARTNER chip -->
        <template v-slot:item.is_partner="{item}">
            <v-chip
              small
              v-show="item.is_partner"
              class="partner-chip"
            >
              {{ item.is_partner }}
            </v-chip>

        </template>
        <!--actions-->
        <template v-slot:item.delete="{item}">
          <div>
              <v-btn @click="openDeleteModal(item, 'broker')" icon
                ><v-icon small>mdi-trash-can-outline</v-icon></v-btn
              >
              <v-btn  @click="resetPassword(item)" icon>
                <v-icon small>mdi-lock-reset</v-icon></v-btn
              >
          </div>
        </template>

        <!--list-->
        <template v-slot:item.banklist="{ item }">
        <admin-list
          @open="handleOpenDropDownMenu"
          @toggle-override="toggleOverride(item, $event)"
          @add="updateBroker(item, 'add', $event.id)"
          @delete="updateBroker(item, 'delete', $event.id)"
          :bank-list="bankList"
          :item="item"
          icon="mdi-bank-outline"
          title="Associated Banks"
          desc="Manage banks and override settings"
          type="broker"
          :overrideSelected="overrideSelected"
          :open-selected-id="openSelectedId"
          :available-items="availableBanksForBroker"
          
        />
      </template>

      <template v-slot:item.partnerlist="{item}">     
          <v-select v-if="!item.is_partner || item.partmaster_id === 0" dense hide-details :items="item.partnerlist"  item-text="name" item-value="id"></v-select>
          <div v-else>-</div>
      </template>
        </management-table>
      </v-tab-item>

      <!--bank-->
      <v-tab-item v-if="isRootBroker">
        <management-table 
          :title="$t('management.banks.title')" 
          :subtitle="$t('management.banks.subtitle')" 
          :cta="$t('management.banks.addBank')"
          :loading="loadingTable"
          :headers="bankHeader"
          :items="bankElements"
          :is-broker="false"
          type="bank"
          @toggle-override="toggleOverride"
          @confirm-delete="openDeleteModal"
          @add="addBrokerOrBank"
          @update="({item, action, id}) => updateBroker(item, action, id)"
          @delete="({item,type})=> openDeleteModal(item,type)"

          >
          <!-- Time Created with browser tooltip -->
          <template v-slot:item.raw_timecreate="{ item }">
            <date-time-layout :timestamp="item.raw_timecreate" />
          </template>

          <!--actions-->
        <template v-slot:item.delete="{item}">
          <div>
              <v-btn @click="openDeleteModal(item, 'bank')" icon
                ><v-icon small>mdi-trash-can-outline</v-icon></v-btn
              >

          </div>
        </template>

        <!--bank mode: auto / manual / override-->
        <template v-slot:item.mode="{ item }">
          <v-btn-toggle
            mandatory
            dense
            outlined
            color="primary"
            class="toggle-over-button"
            :disabled="loadingBankMode === item.id"
            :value="item.is_override"
            @change="(mode) => handleBankMode(mode, item.id)"
          >
            <v-btn :loading="loadingBankMode === item.id && pendingBankMode === 'bankauto'" outlined small value="bankauto">
              auto
            </v-btn>
            <v-btn :loading="loadingBankMode === item.id && pendingBankMode === 'bankmanual'" outlined small value="bankmanual">
              manual
            </v-btn>
            <v-btn :loading="loadingBankMode === item.id && pendingBankMode === 'brkoverride'" small value="brkoverride">
              override
            </v-btn>
          </v-btn-toggle>
        </template>

        <template v-slot:item.brokerlist="{ item }">
            <admin-list
                  @open="handleOpenDropDownMenu"
                  @toggle-override="toggleOverride"
                  @add="updateBroker(item, 'add', $event.id)"
                  @delete="updateBroker(item, 'delete', $event.id)"
                  :update-broker="updateBroker" 
                  :item="item" 
                  icon="mdi-handshake-outline" 
                  title="Associated Brokers" 
                  desc="Manage brokers"
                  type="bank" 
                  :overrideSelected="overrideSelected" 
                  :open-selected-id="openSelectedId" 
                  :available-items="availableBrokersForBanks"/>
        </template>

        </management-table>
      </v-tab-item>

      <!--company-->
      <v-tab-item>
        <management-table 
          :title="$t('management.companies.title')" 
          :subtitle="$t('management.companies.subtitle')" 
          :loading="loadingTable"
          :headers="companyHeaders"
          :items="companyElements"
          :is-broker="false"
          type="company"
          @confirm-delete="openDeleteModal"
          @delete="({item, type})=> openDeleteModal(item, type)"
        >
          <!-- Company Name and Representative merged -->
          <template v-slot:item.name="{ item }">
            <div class="d-flex flex-column align-start">
              <span :title="item.name" class="truncated-name" style="font-weight: bold; font-size: .9rem !important;">
                {{ item.name }}
              </span>
              <span :title="item.representative_name" class="truncated-rep-name caption grey--text">
                {{ item.representative_name }}
              </span>
            </div>
          </template>

          <!-- Time Created with browser tooltip -->
          <template v-slot:item.raw_timecreate="{ item }">
            <date-time-layout :timestamp="item.raw_timecreate" />
          </template>

          <!-- Last Trade with browser tooltip -->
          <template v-slot:item.raw_lastTrade="{ item }">
            <date-time-layout :timestamp="item.raw_lastTrade" />
          </template>

          <!-- Parent Broker with Blue Chip if Partner -->
          <template v-slot:item.broker_master="{item}">
            <div v-if="item.is_broker_resolved" class="d-flex align-center">
              <v-chip
                v-if="item.is_parent_partner"
                small
                outlined
                color="primary"
                style="color: white !important; background: #1f52915e !important"
                class="mr-2"
              >
                Partner
              </v-chip>
              <span>{{ item.broker_master }}</span>
            </div>
            <span v-else-if="item.broker_master !== '-'" class="grey--text font-family-monospace">
              {{ item.broker_master }}
            </span>
            <span v-else>-</span>
          </template>

          <!-- Status with chip -->
          <template v-slot:item.status="{item}">
            <v-chip
              small
              outlined
              :color="getStatusColor(item.status)"
              style="cursor: pointer;"
              @click="confirmToggleStatus(item)"
            >
              {{ $t(`broker.status.${item.status.toLowerCase()}`) }}
            </v-chip>
          </template>

          <!-- Actions -->
          <template v-slot:item.delete="{item}">
            <div class="d-flex align-center">
              <v-tooltip bottom>
                <template v-slot:activator="{ on, attrs }">
                  <v-btn
                    icon
                    small
                    v-bind="attrs"
                    v-on="on"
                    @click="openPhoneModal(item)"
                    class="mr-1"
                  >
                    <v-icon small>mdi-robot</v-icon>
                  </v-btn>
                </template>
                <span>{{ $t('management.botModal.title') }}</span>
              </v-tooltip>
              <v-btn
                icon
                small
                color="primary"
                :disabled="!item.kyc_id"
                :loading="loadingKYC === item.id"
                @click="downloadKYC(item)"
                title="Download KYC documents"
                class="mr-1"
              >
                <v-icon small>mdi-download</v-icon>
              </v-btn>
              <v-btn
                icon
                small
                color="primary"
                :loading="loadingKYCUpload === item.id"
                @click="triggerKYCUpload(item)"
                title="Upload KYC documents"
                class="mr-1"
              >
                <v-icon small>mdi-upload</v-icon>
              </v-btn>
              <v-btn @click="openDeleteModal(item, 'company')" icon>
                <v-icon small>mdi-trash-can-outline</v-icon>
              </v-btn>
            </div>
          </template>

          <!-- Associated Banks list -->
          <template v-slot:item.banklist="{ item }">
            <admin-list
              @open="handleOpenDropDownMenu"
              @add="updateCompany(item, 'add', $event.id)"
              @delete="updateCompany(item, 'delete', $event.id)"
              :bank-list="bankList"
              :item="item"
              icon="mdi-bank-outline"
              title="Associated Banks"
              desc="Manage banks"
              type="company"
              :overrideSelected="overrideSelected"
              :open-selected-id="openSelectedId"
              :available-items="availableBanksForCompany"
              :disabled="!item.is_broker_resolved"
            />
          </template>
        </management-table>
      </v-tab-item>
 <!--user-->
      <v-tab-item>
          <management-table 
          :title="$t('management.users.title')" 
          :loading="loadingTable"
          :headers="userHeaders"
          :items="userElements"
          :is-broker="false"
          type="user"
          >
        
          <!--actions-->
        <template v-slot:item.delete="{item}">
          <div>
              <v-btn @click="openDeleteModal(item, 'user', item.role)" icon
                ><v-icon small>mdi-trash-can-outline</v-icon></v-btn>
          </div>
        </template>

          <!-- Last Online with browser tooltip -->
          <template v-slot:item.last_activity="{ item }">
            <v-chip
              v-if="isOnline(item.last_activity)"
              small
              outlined
              color="green"
            >
              Online
            </v-chip>
            <date-time-layout v-else :timestamp="item.last_activity" />
          </template>

        <template v-slot:item.userlist="{ item }">
            <admin-list
                  @open="handleOpenDropDownMenu"
                  @toggle-override="toggleOverride"
                  @add="updateBroker(item, 'add', $event.id)"
                  @delete="updateBroker(item, 'delete', $event.id)"
                  :update-broker="updateBroker" 
                  :item="item" 
                  icon="mdi-handshake-outline" 
                  title="Associated Brokers" 
                  desc="Manage brokers"
                  type="bank" 
                  :overrideSelected="overrideSelected" 
                  :open-selected-id="openSelectedId" 
                  :available-items="availableBrokersForBanks"/>
        </template>

          <template v-slot:item.id="{ item }">
            <copyable-id :id="item.id" type="User" />
          </template>

          <template v-slot:item.broker="{ item }">
            <copyable-id :id="item.broker" type="Broker" />
          </template>

          <template v-slot:item.company="{ item }">
            <copyable-id :id="item.company" type="Company" />
          </template>


          <template v-slot:item.bank="{ item }">
            <copyable-id :id="item.bank" type="Bank" />
          </template>

          <template v-slot:item.name="{item}">
            <div class="d-flex flex-column">
              <span :title="item.user_title" style="font-weight: bold; font-size: .9rem !important;">{{ item.name }}</span>
              <span :title="item.entity_title" class="caption grey--text">{{ item.entity_name }}</span>
            </div>
          </template>

            <template v-slot:item.role="{item}">
              <v-chip  class="chip" :style="{backgroundColor: formatChipColorAndBG(item.role).background, 
                border: `1px solid ${formatChipColorAndBG(item.role).color} !important`}"    small>
                <span class="white--text" >{{ item.role.charAt(0).toUpperCase() + item.role.slice(1) }}</span>
              </v-chip>
          </template>

          <template v-slot:item.raw_timecreate="{ item }">
            <date-time-layout :timestamp="item.raw_timecreate" />
          </template>

          <template v-slot:item.raw_tos_accepted_time="{ item }">
            <date-time-layout :timestamp="item.raw_tos_accepted_time" />
          </template>
        </management-table>
      </v-tab-item>

    </v-tabs-items>
    <!--create modal-->
    <create-broker-or-bank-modal
      :loading-delete="loadingDelete"
      :broker-list="visibleBrokerList"
      :bank-list="bankList"
      :typeOfCreation="creationType"
      @created="handleCreateBroker"
      v-model="createBrokerModal"
    />
    <delete-modal
      :loading="loadingDelete"
      v-model="confirmDeleteModal"
      :item-label="deleteObj.email || deleteObj.cnpj || deleteObj.id"
      @confirm="confirmDeleteEntity"
    />
    <reset-password-modal
    v-model="resetPasswordModal"
    @handle-reset-password="resetIt"
    :loading-delete="loadingReset"/>

    <!-- Status toggle confirmation modal -->
    <v-dialog v-model="confirmStatusModal" width="400">
      <v-card class="pa-4 d-flex align-center flex-column justify-center text-center">
        <v-card-title class="font-weight-bold">Confirm Status Change?</v-card-title>
        <v-card-subtitle class="mt-2">
          Are you sure you want to change the status of <strong>{{ statusToggleItem ? statusToggleItem.name : '' }}</strong> to 
          <span :class="statusToggleItem && statusToggleItem.status === 'Active' ? 'orange--text' : 'green--text'">
            {{ statusToggleItem && statusToggleItem.status === 'Active' ? 'Paused' : 'Active' }}
          </span>?
        </v-card-subtitle>
        <v-card-actions class="d-flex flex-gap-2 justify-end w-100 mt-4">
          <v-btn
            @click="confirmStatusModal = false"
            color="primary"
            outlined
          >
            Cancel
          </v-btn>
          <v-btn
            @click="toggleCompanyStatus"
            :loading="loadingStatusToggle"
            color="primary"
          >
            Confirm
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="3000"
      >{{ snackbar.message }}</v-snackbar
    >

    <company-phone-link-modal
      v-model="phoneModal"
      :company="selectedPhoneCompany"
      @updated="fetchCompanyById"
    />

    <!--kyc upload input-->
    <input
      @change="handleCompanyKYCUpload"
      multiple
      type="file"
      ref="companyDocumentInput"
      style="display: none"
      accept=".pdf"
    />
  </section>
</template>
<script>
import { mapActions, mapStores } from "pinia";
import { useExecutionStore, useSettingsStore, useAdminStore, useImportFiles, useUploadStore, MAX_KYC_FILE_SIZE } from "./../store/index";
import CreateBrokerOrBankModal from "@/components/modal/CreateBrokerOrBankModal.vue";
import convertToCNPJ from "@/utils";
import DeleteModal from "@/components/modal/DeleteModal.vue";
import ResetPasswordModal from "@/components/modal/ResetPasswordModal.vue";
import { useAuthStore } from "@/store/console";
import AdminList from "@/components/admin/AdminList.vue";
import { i18n } from "@/plugins/vuetify"
import { generateBrokerJSON } from "@/exportBrokersJson.js";
import ManagementTable from "@/components/admin/ManagementTable.vue";
import DateTimeLayout from "@/components/common/DateTimeLayout.vue";
import CompanyPhoneLinkModal from "@/components/modal/CompanyPhoneLinkModal.vue";
import CopyableId from "@/components/common/CopyableId.vue";
import { formatShortDate, formatTimeAndDate, isClearfxaiBroker, scopeBrokersToCurrentBroker, scopeCompaniesToCurrentBroker, scopeUsersToCurrentBroker } from "@/utils";

export default {
  mounted() {
    setInterval(() => {
      this.fetchBrokerList();
      this.fetchBankList();
      this.fetchUserList();
      this.fetchCompanyById();
    }, 2000);
  },
  components: {
    CreateBrokerOrBankModal,
    DeleteModal,
    ResetPasswordModal,
    AdminList,
    ManagementTable,
    DateTimeLayout,
    CompanyPhoneLinkModal,
    CopyableId
  },
  data() {
    return {
      phoneModal: false,
      selectedPhoneCompany: null,
      creationType: '',
      loadingKYC: null,
      loadingKYCUpload: null,
      kycUploadTargetCompany: null,
      loadingBankMode: null,
      pendingBankMode: null,
      snackbar: {
        show: false,
        color: "green",
        message: "",
      },
      openSelectedId:null,
      bankElement : {},
      bankModal: false,
      loadingDelete: false,
      loadingReset: false,
      loadingTable:true,
      confirmDeleteModal: false,
      overrideSelected: [],
      brokerList: [],
      bankList: [],
      userList: [],
      companyList: [],
      deleteObj: {},
      createBrokerModal: false,
      tab: null,
      resetPasswordModal: false,
      confirmStatusModal: false,
      statusToggleItem: null,
      loadingStatusToggle: false,
      brokerHeader: [  
        { text: "", value: "is_partner", sortable: false },
        {
          text: this.$t("management.brokers.headers.timeCreated"),
          value: "raw_timecreate",
          width: "130px"
        },
        {
            text: "First Login",
            value: "raw_first_login",
            width: "130px"
          },
        { text: "CNPJ", value: "cnpj", width: "200px" },
        { text: this.$t("management.brokers.headers.name"), value: "name" },
        { text: this.$t("broker.labels.email"), value: "email" },
        { text: this.$t("management.brokers.headers.originalBroker"), value: "broker_master" },
        { text: this.$t("management.brokers.headers.spread"), value: "spread", sortable: false },
        { text: this.$t("management.brokers.headers.spreadType"), value: "spread_type", sortable: false, width: "110px" },
        { text: this.$t("management.brokers.headers.partnerList"), value: "partnerlist", sortable: false, width:"110px"  },
        { text: this.$t("management.brokers.headers.bankList"), value: "banklist", sortable: false, width:"110px" },

        {
          text: this.$t("broker.clientPortfolio.headers.actions"),
          value: "delete",
          sortable: false,
        },
      ],
      bankHeader: [
        {
          text: "Date Created",
          value: "raw_timecreate",
        },
        { text: "Code", value: "bankcode" },
        { text: "CNPJ", value: "cnpj" },
        { text: "Name", value: "name" },
        { text: this.$t("broker.labels.email"), value: "email" },
        { text: "Mode", value: "mode", sortable: false, width: "220px" },
        { text: "Broker List", value: "brokerlist" },

        {
          text: this.$t("broker.clientPortfolio.headers.actions"),
          value: "delete",
          sortable: false,
        },
      ],
      userHeaders: [
        { text: '', value: 'role' },
        {
          text: "Last Online",
          value: "last_activity",
          width: "130px"
        },
        {
          text: this.$t("management.brokers.headers.timeCreated"),
          value: "raw_timecreate",
          width: "130px",
          sortable: true
        },
        { text: 'TOS Accepted', value: 'raw_tos_accepted_time', width: '130px', sortable: true },
        { text: 'ID', value: 'id' },
        { text: 'CNPJ', value: 'cnpj' },
        { text: 'Name', value: 'name' },
        { text: 'Email', value: 'email' },
        { text: 'Broker ID', value: 'broker' },
        { text: 'Company ID', value: 'company' },
        { text: 'Bank ID', value: 'bank' },
        {
          text: this.$t("broker.clientPortfolio.headers.actions"),
          value: "delete",
          sortable: false,
        },
      ],
      companyHeaders: [
        {
          text: this.$t("management.brokers.headers.timeCreated"),
          value: "raw_timecreate",
          width: "130px"
        },
        { text: this.$t("broker.labels.companyName"), value: "name" },
        { text: "CNPJ", value: "cnpj", width: "200px" },
        { text: this.$t("broker.labels.email"), value: "email" },
        { text: this.$t("management.brokers.headers.originalBroker"), value: "broker_master" },
        { text: this.$t("broker.clientPortfolio.headers.status"), value: "status" },
        { text: this.$t("broker.clientPortfolio.headers.lastTrade"), value: "raw_lastTrade" },
        { text: this.$t("management.brokers.headers.bankList"), value: "banklist", sortable: false, width: "110px" },
        {
          text: this.$t("broker.clientPortfolio.headers.actions"),
          value: "delete",
          sortable: false,
        },
      ]
    };
  },
    watch: {
    tab() {
      if (this.openSelectedId) {
        const ref = this.$refs['bankSelect-' + this.openSelectedId]
        const select = Array.isArray(ref) ? ref[0] : ref
        if (select) select.isMenuActive = false
        this.openSelectedId = null
      }
    }
  },
  computed: {
    ...mapStores(useSettingsStore),
    banksToAdd:{
      get(){
        new Set(this.bankList.map(b => b.id))
      },
      set(bankId)
      {
        this.updateBroker(this.selectedBroker, 'add', bankId)
      }
    },
    userElements(){
      const list = this.visibleUserList;
      return list.filter(li => li.id).map((element) => {
        let cnpj = '-'
        let entityName = '-'

        if (element.role?.includes('broker') || element.role?.includes('partner')) {
          const brokerObj = this.brokerList.find(b => b.id === element.broker)
          cnpj = brokerObj?.cnpj || '-'
          entityName = brokerObj?.name || '-'
        }
        else if (element.role?.includes('bank')) {
          const bankObj = this.bankList.find(b => b.id === element.bank)
          cnpj = bankObj?.cnpj || '-'
          entityName = bankObj?.name || '-'
        }
        else {
          const companyObj = this.companyList.find(c => c.id === element.company)
          cnpj = companyObj?.cnpj || '-'
          entityName = companyObj?.name || '-'
        }

        let entityPrefix = 'Company'
        if (element.role?.includes('broker') || element.role?.includes('partner')) {
          entityPrefix = 'Broker'
        } else if (element.role?.includes('bank')) {
          entityPrefix = 'Bank'
        }

        const date = this.formatDate(element.timecreate);
        const acceptedTime = element.tos && element.tos.acknowledgedAt ? element.tos.acknowledgedAt : null
        const result = {}
        result.id = element.id
        result.name = element.name
        result.email = element.email
        result.broker = element.broker ?? '-'
        result.company = element.company ?? '-'
        result.bank = element.bank ?? '-'
        result.role = element.role
        result.entity_name = entityName
        result.entity_title = `(${entityPrefix}) ${entityName}`
        result.user_title = `(User) ${element.name}`
        result.cnpj = convertToCNPJ(cnpj)
        result.timecreate = date
        result.raw_timecreate = element.timecreate
        result.tos_accepted_time = acceptedTime ? this.formatDate(acceptedTime) : '-'
        result.raw_tos_accepted_time = acceptedTime
        result.last_activity = element.last_activity;
        return result
      })
    },
    //bankList(){}
    isRootBroker() {
      return isClearfxaiBroker();
    },
    // Only ClearFX AI sees every broker. Any other broker is limited to itself
    // and to the partners it masters, so nobody browses a competitor's book.
    // `brokerList` stays whole on purpose: the company/user tabs still resolve
    // parent-broker names through it.
    visibleBrokerList() {
      return scopeBrokersToCurrentBroker(this.brokerList);
    },
    // Companies follow the brokers: a broker sees the ones sitting under itself
    // or under one of its partners. `companyList` stays whole so deletions and
    // refetches keep working on the real data.
    visibleCompanyList() {
      return scopeCompaniesToCurrentBroker(this.companyList, this.brokerList);
    },
    // Users follow their entity: visible when they sit under a broker or a
    // company this broker already sees. `userList` stays whole so the broker
    // and company tabs keep resolving emails and representative names.
    visibleUserList() {
      return scopeUsersToCurrentBroker(this.userList, this.companyList, this.brokerList);
    },
    brokerElements() {
      const list = this.visibleBrokerList;
      return list.filter(li => li.id)
        .map((element) => {
          const originalBroker = this.brokerList.find(e => e.id === element.partmaster_id)
          const banks = element.banklist.map(bi => this.bankList.find(b => b.id === bi.id)).filter(Boolean).map(b => ({
            id: b.id,
            name: b.name,
            cnpj: b.cnpj,
            is_override: b.is_override ?? null,
          }))
          const brokerUser = this.userList.find(u => u.broker === element.id)
          const brokerEmail = brokerUser?.email 
          const rawFirstLogin = brokerUser?.first_login
          const firstLoginFormatted = rawFirstLogin ? this.formatDate(rawFirstLogin) : '-'

          const date = this.formatDate(element.timecreate);
          const result = {};
          result.id = element.id;
          result.user_id = element.user_id
          result.cnpj = convertToCNPJ(element.cnpj);
          result.email = brokerEmail;
          result.first_login = firstLoginFormatted;
          result.raw_first_login = rawFirstLogin;
          result.name = element.name;
          result.banklist = banks;
          result.partnerlist = element.partnerlist;
          result.broker_master = originalBroker?.name || '-'
          result.spread = element.spread_type === 'PIPS' ? element.spread : element.spread_bps
          result.spread_type = element.spread_type
          result.timecreate = date;
          result.raw_timecreate = element.timecreate;
          result.last_online = element.last_online ? this.formatDate(element.last_online) : '-';
          result.is_partner = (element.partmaster_id && element.partmaster_id !== 0 && element.partmaster_id !== '0') ? "Partner" : "";
          return result
        }).sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    },
    bankElements() {
      const list = Array.isArray(this.bankList) ? this.bankList : [];
      return list.map((element) => {
        const brokers = element.brokerlist.map(bId => {
         return  this.brokerList.find(b=>b.id === bId)
        }
        ).filter(Boolean).map(b=>b.name)
        const date = this.formatDate(element.timecreate);

        const result = {};
        result.id = element.id;
        result.bankcode = element.bankcode
        result.brokerlist = brokers;
        result.user_id = element.user_id
        result.email = element.email;
        result.name = element.name;
        result.cnpj = convertToCNPJ(element.cnpj);
        result.is_override = element.is_override || 'bankauto';
        result.timecreate = date;
        result.raw_timecreate = element.timecreate;

        return result;
      }).sort((a,b)=>a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    },
    companyElements() {
      const list = this.visibleCompanyList;
      return list.map((element) => {
        const parentBroker = this.brokerList.find(b => b.id === element.broker)
        const hasBrokerId = !!(element.broker && element.broker !== 0 && element.broker !== '0')
        const brokerMasterName = parentBroker ? parentBroker.name : (hasBrokerId ? element.broker : '-')
        const companyUser = this.userList.find(u => u.company === element.id)
        const date = this.formatDate(element.timecreate);
        
        const banks = Array.isArray(element.banklist) 
          ? element.banklist.map(bi => {
              const b = this.bankList.find(bank => bank.id === bi.id)
              return b ? { id: b.id, name: b.name, cnpj: b.cnpj, is_override: b.is_override ?? null } : null
            }).filter(Boolean)
          : []

        return {
          id: element.id,
          user_id: companyUser?.id || element.user_id || '-',
          cnpj: convertToCNPJ(element.cnpj),
          name: element.name,
          representative_name: companyUser?.name || element.representative_name || '-',
          email: companyUser?.email || element.email || '-',
          broker_master: brokerMasterName,
          is_broker_resolved: !!parentBroker,
          is_parent_partner: parentBroker ? (parentBroker.partmaster_id && parentBroker.partmaster_id !== 0 && parentBroker.partmaster_id !== '0') : false,
          status: element.blocked === 1 ? "Paused" : "Active",
          lastTrade: element.lastTrade ? this.formatDate(element.lastTrade) : '-',
          raw_lastTrade: element.lastTrade,
          timecreate: date,
          raw_timecreate: element.timecreate,
          banklist: banks,
          parent_broker_id: element.broker,
          kyc_id: element.kyc_id,
          phone: element.phone || null,
          quotebot_link: element.quotebot_link || { status: 'unlinked', telegram_user_id: null, linked_at: null }
        }
      }).sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    },
  },
  methods: {
    ...mapActions(useExecutionStore, [
      "getBrokerById",
      "putBankById",
      "putBroker",
      "putCompany",
      "getCompanyStats",
      "updateKYC",
    ]),
    ...mapActions(useAdminStore, [
      "createBroker",
      "createClientUser",
      "userEntityDelete",
      "getBrokerList",
      "getBankList",
      "getUserList",
      "deleteBroker",
      "deleteBank",
      "getCompanyList",
      "createBankWithUser",
      "deleteUserById",
      "updateUserPassword",
    ]),
    async fetchBrokerList() {
      const { data } = await this.getBrokerList();
      this.brokerList = data;
      this.loadingTable = false
    },
    async fetchBankList() {
      const { data } = await this.getBankList();
      this.bankList = data;
      this.loadingTable = false
    },
    async fetchUserList() {
      const { data } = await this.getUserList();      
      this.userList = data;
      this.loadingTable = false
    },
    async fetchCompanyById() {
      const [companiesRes, statsRes] = await Promise.all([
        this.getCompanyList(),
        this.getCompanyStats()
      ])
      const list = Array.isArray(companiesRes.data) ? companiesRes.data : []
      const statsMap = statsRes.data || {}
      // Merge stats onto each company by id.
      list.forEach(c => Object.assign(c, statsMap[c.id] || {}))
      this.companyList = list
    },
    async downloadKYC(item) {
      this.loadingKYC = item.id;
      try {
        const zipStore = useImportFiles();
        await zipStore.downloadFiles('kyc', item.id, item.name, item.is_parent_partner);
      } catch (error) {
        console.error("Error downloading KYC: ", error);
        this.snackbar = {
          show: true,
          color: "error",
          message: "Failed to download KYC files."
        };
      } finally {
        this.loadingKYC = null;
      }
    },
    triggerKYCUpload(item) {
      this.kycUploadTargetCompany = item;
      if (this.$refs.companyDocumentInput) {
        this.$refs.companyDocumentInput.value = null;
        this.$refs.companyDocumentInput.click();
      }
    },
    async handleCompanyKYCUpload(event) {
      const files = Array.from(event.target.files || []);
      event.target.value = null;
      const company = this.kycUploadTargetCompany;
      this.kycUploadTargetCompany = null;
      if (!files.length || !company) return;

      const uploadStore = useUploadStore();
      const result = uploadStore.prepareUploadForKYC({
        filesList: files,
        id: company.id,
        minFiles: 0,
      });

      if (!result.ok || result.rejectedOversize?.length || result.extraFiles?.length) {
        const maxSizeMB = bytesToDisplayMB(result.maxSizeBytes || MAX_KYC_FILE_SIZE);
        const parts = [];
        if (result.rejectedOversize?.length) parts.push(`Files exceeding ${maxSizeMB} were skipped.`);
        if (result.extraFiles?.length) parts.push('Too many files selected, some were skipped.');
        this.confirmSnackBar(parts.join(' ') || 'Error validating files', 'red');
        if (!result.ok) return;
      }

      this.loadingKYCUpload = company.id;
      let kycId = company.kyc_id || null;
      const errors = [];

      for (const file of uploadStore.KYCFiles.docs) {
        try {
          const normalizedName = file.name.normalize('NFD').replace(/\p{Diacritic}/gu, '');
          const newFile = new File([file], normalizedName, { type: file.type });
          const response = await this.updateKYC(newFile, company.id, company.parent_broker_id, kycId);
          kycId = response.data?.kyc_id || kycId;
        } catch (e) {
          console.warn('error uploading KYC file', file.name, e?.message);
          errors.push(file.name);
        }
      }

      this.loadingKYCUpload = null;
      if (errors.length) {
        this.confirmSnackBar(`Failed to upload: ${errors.join(', ')}`, 'red');
      } else {
        this.confirmSnackBar('KYC files uploaded!');
      }
      this.fetchCompanyById();
    },
    formatChipColorAndBG(role){
      if(role === 'partner')
      {
        return {
          color: '#008000',
          background: '#0080005e'
        }
      }
      else if (role === 'broker') {
        return {
          color: '#0155bb',
          background: '#1f52915e'
        }
      }
      else if (role === 'bank') {
        return {
        color: '#e53935',
        background: '#e539355e'
        }
      }

      return {
        color: '#4D4D4D',
        background: '#1C1C1C'
      } 
    },
    exportBrokers(){
      generateBrokerJSON(this.visibleBrokerList)
    },

    handleOpenDropDownMenu(item) {
      if (!item) { this.openSelectedId = null; return; }
      if (this.openSelectedId && this.openSelectedId !== item.id) {
        const prevRef = this.$refs['bankSelect-' + this.openSelectedId]
        const prev = Array.isArray(prevRef) ? prevRef[0] : prevRef
        if (prev) prev.isMenuActive = false
      }
      this.openSelectedId = this.openSelectedId === item.id ? null : item.id
      
    },
    updateBroker(item, type, bank){
      const rawBroker = this.brokerList.find(
        b => b.cnpj.replace(/\D/g, '') === item.cnpj.replace(/\D/g, '')
      )
      let banklist = [...rawBroker.banklist]
      const bankName = this.bankList.find(b => b.id === bank)

      const currentBankBrokerList = (bankName.brokerlist||[]).map(b => typeof b === "object" ? b.id : b).filter(Boolean);
      let nextBankBrokerList = [...currentBankBrokerList]

      if (type === 'delete') {
        banklist = banklist.filter(b => b.id !== bank)
         if (nextBankBrokerList.includes(rawBroker.id)) {
            nextBankBrokerList = nextBankBrokerList.filter(id => id !== rawBroker.id);
         }

      }
      else if (type === 'add' && !banklist.some(b => b.id === bank)) {
        banklist.push({
          id: bank,
          name: bankName.name,
          email: bankName?.email || '',
          timeDue: bankName.timeDue ?? null,
          isOverride: bankName.is_override
        })
      }
            if (!nextBankBrokerList.includes(rawBroker.id)) {
                nextBankBrokerList.push(rawBroker.id);
        }
      this.updateBanksList(rawBroker.id, nextBankBrokerList)
      .then(()=>{
          this.putBroker(
          { banklist },
          rawBroker.id
        )
            const msg = type === 'delete' ? 'Bank Deleted!' : 'Bank Added!'
            this.confirmSnackBar(msg)
      })
        .catch((e)=>{console.warn('error updating', e?.message)})
    },
    handleBankMode(mode, bankId) {
      if (!mode) return
      this.loadingBankMode = bankId
      this.pendingBankMode = mode
      this.putBankById(bankId, { is_override: mode })
        .then(() => {
          const bank = this.bankList.find(b => b.id === bankId)
          if (bank) bank.is_override = mode
          return this.syncBankModeToLinkedEntities(bankId, mode)
        })
        .then(() => {
          this.confirmSnackBar('Bank mode updated!')
        })
        .catch((e) => {
          console.warn('error updating bank mode', e?.message)
          this.confirmSnackBar(e?.response?.data?.detail || 'Error updating bank mode', 'red')
        })
        .finally(() => {
          this.loadingBankMode = null
          this.pendingBankMode = null
        })
    },
    // Every broker/company keeps its own denormalized copy of a linked bank's mode
    // (set at link-time in updateBroker/updateCompany). Changing the bank's mode here
    // only updates the bank record itself, so without this, entities that already linked
    // the bank keep serving the stale mode (e.g. to the trading/RFQ screens) until
    // someone re-links the bank.
    syncBankModeToLinkedEntities(bankId, mode) {
      const brokerUpdates = this.brokerList
        .filter(b => Array.isArray(b.banklist) && b.banklist.some(bl => bl.id === bankId))
        .map(b => {
          const banklist = b.banklist.map(bl => bl.id === bankId ? { ...bl, isOverride: mode } : bl)
          b.banklist = banklist
          return this.putBroker({ banklist }, b.id).catch(e => {
            console.warn('error syncing bank mode to broker', b.id, e?.message)
          })
        })

      const companyUpdates = this.companyList
        .filter(c => Array.isArray(c.banklist) && c.banklist.some(bl => bl.id === bankId))
        .map(c => {
          const banklist = c.banklist.map(bl => bl.id === bankId ? { ...bl, isOverride: mode } : bl)
          c.banklist = banklist
          return this.putCompany({ id: c.id, banklist }).catch(e => {
            console.warn('error syncing bank mode to company', c.id, e?.message)
          })
        })

      return Promise.all([...brokerUpdates, ...companyUpdates])
    },
    toggleOverride(i, j)
    {
      const override = {"is_override" : j.is_override}
      this.putBankById(j.id, override)
        .then(() => {
          const text = i.is_override ? 'Override Bank is On!' : 'Override Bank is Off!'
          this.confirmSnackBar(text)
        })
    },
    availableBrokersForBanks(bank) {
      const linkedIdSet = new Set((bank.brokerlist || []).map(b => b.id))

      return this.visibleBrokerList.filter(b => !linkedIdSet.has(b.id))
    },
    availableBanksForBroker(broker) {
      const linkedIdSet = new Set((broker.banklist || []).map(b => b.id))

      return this.bankList.filter(b => !linkedIdSet.has(b.id))
    },
    availableBanksForCompany(company) {
      const parentBroker = this.brokerList.find(b => b.id === company.parent_broker_id)
      if (!parentBroker || !parentBroker.banklist) return [];
      const parentBankIds = new Set(parentBroker.banklist.map(b => b.id))
      const companyBankIds = new Set((company.banklist || []).map(b => b.id))
      return this.bankList.filter(b => parentBankIds.has(b.id) && !companyBankIds.has(b.id))
    },
    updateCompany(item, type, bank) {
      const rawCompany = this.companyList.find(
        c => c.cnpj.replace(/\D/g, '') === item.cnpj.replace(/\D/g, '')
      )
      if (!rawCompany) return;
      
      let banklist = [...(rawCompany.banklist || [])]
      const bankName = this.bankList.find(b => b.id === bank)

      if (type === 'delete') {
        banklist = banklist.filter(b => b.id !== bank)
      } else if (type === 'add' && !banklist.some(b => b.id === bank)) {
        banklist.push({
          id: bank,
          name: bankName.name,
          email: bankName?.email || '',
          timeDue: bankName.timeDue ?? null,
          isOverride: bankName.is_override
        })
      }

      this.putCompany({
        id: rawCompany.id,
        banklist: banklist
      })
      .then(() => {
        const msg = type === 'delete' ? 'Bank Deleted!' : 'Bank Added!'
        this.confirmSnackBar(msg)
      })
      .catch((e) => {
        console.warn('error updating company banks', e?.message)
        this.confirmSnackBar(e?.response?.data?.detail || 'Error updating banks', 'red')
      })
    },
    resetPassword(item)
    {
      this.deleteObj.id = item.id
      this.deleteObj.email = item.email ?? '';
      this.deleteObj.cnpj = item.cnpj;
      this.resetPasswordModal = true
    },
    confirmSnackBar(msg, color = 'green') {
      this.snackbar.show = true;
      this.snackbar.message = msg;
      this.snackbar.color = color
      this.loadingDelete = false;
      this.loadingReset = false
    },
    //deleting
    openDeleteModal(item, tableRole) {
      this.deleteObj.id = tableRole !== 'user' ?  item.id : item.bank != '-' ? item.bank : item.broker !== '-' ? item.broker : item.company
      this.deleteObj.user_id = tableRole !== 'user' ? item.user_id : item.id
      this.deleteObj.email = item.email ?? '';
      this.deleteObj.cnpj = item.cnpj?.replace(/\D/g, "");
      this.deleteObj.type = tableRole;
      this.deleteObj.role = item.role
      this.confirmDeleteModal = true;
    },
    confirmToggleStatus(item) {
      this.statusToggleItem = item;
      this.confirmStatusModal = true;
    },
    toggleCompanyStatus() {
      if (!this.statusToggleItem) return;
      this.loadingStatusToggle = true;
      const nextBlocked = this.statusToggleItem.status === 'Active' ? 1 : 0;
      this.putCompany({
        id: this.statusToggleItem.id,
        blocked: nextBlocked
      })
      .then(() => {
        this.confirmSnackBar('Status Updated!');
        this.fetchCompanyById();
      })
      .catch((e) => {
        console.error('Error toggling company status', e);
        this.confirmSnackBar(e?.response?.data?.detail || 'Error updating status', 'red');
      })
      .finally(() => {
        this.loadingStatusToggle = false;
        this.confirmStatusModal = false;
        this.statusToggleItem = null;
      });
    },
    formatDeleteRole(){
      if(this.deleteObj.type === 'user')
      {
        return this.deleteObj.role === 'pro' ? this.deleteObj.role = 'company' : this.deleteObj.role
      }
      return this.deleteObj.type
    },
  confirmDeleteEntity() {
      this.loadingDelete = true;
      if (this.deleteObj.type === 'user') {
        this.deleteUserById(this.deleteObj.user_id)
          .then((res) => {
             this.updateCompanyList()
             this.confirmSnackBar('Deleted')
             this.confirmDeleteModal = false
          })
          .catch((e) => {
             this.confirmSnackBar(`${e?.message || 'error while deleting'}`, 'red')
             console.error('ERROR while deleting', e?.message)
          })
        return
      }
      const role = this.formatDeleteRole()
      this.userEntityDelete(role, this.deleteObj.id)
        .then((res)=>{
            this.updateCompanyList()
            this.confirmSnackBar(`Deleted`);
            this.confirmDeleteModal = false;
        })
        .catch((e)=>{
          this.confirmSnackBar(`${e?.message || 'error while deleting'}`, 'red');
          console.error('ERROR while deleting', e?.message)
        })
    },
    resetIt(v) {
      this.loadingReset = true
      const data = {
        ...this.deleteObj,
        passwd: md5(v)
      }
      this.updateUserPassword(v, this.deleteObj.email)
        .then(() => { })
        .catch(e => console.log(e))
        .finally(() => {
          this.confirmSnackBar('Password Updated!')
          this.resetPasswordModal = false
        })

    },
    updateCompanyList()
    {
        this.userList = this.userList.filter(u=>u.id !== this.deleteObj.user_id)
        this.companyList = this.companyList.filter(u=>u.id !== this.deleteObj.id)
    },
    formatDate(time) {
      return formatShortDate(time);
    },
    formatTimeAndDate(epoch) {
      return formatTimeAndDate(epoch);
    },
    isOnline(lastOnlineEpoch) {
      if (!lastOnlineEpoch) return false;
      return (Date.now() / 1000 - lastOnlineEpoch) <= 15 * 60;
    },
    formatTimePart(epoch) {
      if (!epoch) return "";
      const toMs = v => {
        const n = Number(v);
        if (!isFinite(n)) return Date.now();
        return n > 1e12 ? n : Math.round(n * 1000);
      };
      const date = new Date(toMs(epoch));
      const timeZone = this.settingsStore.timezone === 'BRT' ? 'America/Sao_Paulo' : 'UTC';
      const timezoneLabel = this.settingsStore.timezone;
      
      const timeOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone
      };
      
      const formattedTime = new Intl.DateTimeFormat('pt-BR', timeOptions).format(date);
      return `${formattedTime} ${timezoneLabel}`;
    },
    addBrokerOrBank(type) {
      this.createBrokerModal = true;
      this.creationType = type;
    },
    updateBanksList(brokerId, bankIds = []) {
      const updateBanks = this.bankList.map(b => {
        const shouldHaveBroker = bankIds.includes(b.id)
        const hasBroker = (b.brokerlist || []).includes(brokerId)

        if (shouldHaveBroker && !hasBroker) {
          return this.putBankById(b.id, {
            brokerlist: [...(b.brokerlist || []), brokerId]
          })
        }
        if (!shouldHaveBroker && hasBroker) {
          return this.putBankById(b.id, {
            brokerlist: (b.brokerlist || []).filter(id => id !== brokerId)
          })
        }
        return null
      }
      ).filter(Boolean)

      return Promise.all(updateBanks)

    },
    handleCreateBroker(payload) {
      if (this.creationType === "broker") {
        this.createBroker(payload)
          .then((res) => {

            const brokerId = res.data.id

            if (payload.banklist?.length) {
              this.updateBanksList(brokerId, payload.banklist)
            }
          })
          .then(() => {
            this.confirmSnackBar('User successfully created')
            this.createBrokerModal = false
            this.creationType = null
          })
          .catch((e) => {
            this.confirmSnackBar(`ERROR in creating user, ${e}`, 'red')
          })
          .finally(() => {
            this.createBrokerModal = false;
          })

      } else if (this.creationType === "bank") {
        this.createBankWithUser(payload)
          .then(() => { })
          .catch((e) => console.error("error ", e))
          .finally(() => {
            this.confirmSnackBar("User successfully created");
            this.createBrokerModal = false;
            this.creationType = null;
          });
      }
    },
    getStatusColor(status) {
      const s = status.toLowerCase();
      if (s === "active" || s === "ativo") return "green";
      if (s === "deal" || s === "negocio") return "green";
      if (s === "paused" || s === "pausado") return "orange lighten-3";
      if (s === "pending auth" || s === "pendente autenticação")
        return "blue lighten-4";
      if (s === "pending" || s === "pendente") return "orange darken-2";
      return "grey darken-1";
    },
    openPhoneModal(item) {
      this.selectedPhoneCompany = item;
      this.phoneModal = true;
    },
  },
};
</script>

<style scoped>
::v-deep .v-data-table>.v-data-table__wrapper>table>tbody>tr>td {
  height: 35px;
}

::v-deep .v-data-table>.v-data-table__wrapper>table>tbody>tr>td span {
  /*
  We have a global !important CSS rule for `...>tr>td`
  If we use a slot to render a cell ourselves, that rule would break.
  So here we apply the same `font-size` to make text sizes consistent.
  */
  font-size: 0.875rem !important;
}

.v-data-table table {
  max-width: 100%;
  display: flex;
  flex-direction: column;
}

.cnpj-title {
  font-size: var(--cnpj-font-size) !important;
  white-space: nowrap;
}

::v-deep .v-data-table {
  padding: 0 !important;
}

.truncated-name {
  display: inline-block;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}

.truncated-rep-name {
  display: inline-block;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}

::v-deep .v-select .v-input__control {
  min-height: 20px !important;
  width: 30px !important;
}

::v-deep .v-text-field__details {
  display: none;
}

.chip {
  width: 60px;
  padding: 0;
  justify-content: center;
}

::v-deep .none {
  background: none !important;
}

::v-deep .v-list-item__action {
  flex: 1 1 auto !important;
}

::v-deep .select-bank .v-input__control .v-input__slot {
  visibility: hidden !important;
}
</style>
