<template>
  <div>
    <v-bottom-sheet v-if="!isReconciliation" v-model="internal" hide-overlay  @keydown.esc="handleClose" >
      <the-rfq-card :is-reconciliation="isReconciliation" :mini="mini" :toggle-minimize-height="toggleMinimizeHeight"
        :toggle-minimize-width="toggleMinimizeWidth" :format-title="formatTitle" :quote="quote"
        :disable-quote="disableQuote" @update:quote="quote = $event" :font-size="fontSize" @toggle-mini="mini = !mini" 
        @close="handleClose" @submit="handleSubmit" />
    </v-bottom-sheet>
    <v-dialog v-model="internal" max-width="600" content-class="reconciliation-dialog" transition="dialog-bottom-transition"   @keydown.esc="handleClose"  v-else>
      <the-rfq-card :is-reconciliation="isReconciliation" :mini="mini" :toggle-minimize-height="toggleMinimizeHeight"  :format-title="formatTitle" :quote="quote"
        :disable-quote="disableQuote" :checked="checkboxValue" @update:checked="checkboxValue = $event"
        @update:quote="quote = $event" :font-size="fontSize" @toggle-mini="mini = !mini" @close="handleClose"
        @submit="handleSubmit" :broker-name="brokerName" :is-partner="isPartner" :company-cnpj="companyCnpj" :company-name="companyName"  />
    </v-dialog>
  </div>
</template>

<script>
import TheRfqCard from '../common/TheRfqCard.vue';
import { normalizeReconciliationPayload } from '@/utils.js';
export default {
  name: "RfqWindow",
  components: { TheRfqCard },
  props: {
    value: Boolean,
    rfqToManualPrice: Object,
    fontSize: Number,
    mode: {
      type: String,
      default: "manual"
    }
  },
  data() {
    return {
      quote: '',
      mini: false,
      modelQuote: '',
      internal: this.value,
      checkboxValue: null,
    };
  },
  watch: {
    value(val) {
      this.internal = val
      if (val && this.isReconciliation) {
        this.quote = ''
        this.checkboxValue = null
      }
    },
    internal(val) {
      this.$emit('input', val)
    }
  },
  computed: {
      brokerName() {
        try {
          if (this.rfqToManualPrice?.message?.partner)
          {
            return this.rfqToManualPrice?.message?.partner.name
          }

          return JSON.parse(
            localStorage.getItem("brokerUserInfo") || "{}"
          ).name
        } catch (error) {
          return {}
        }
      },

      companyName() {
        const message = this.rfqToManualPrice?.message || {}

        return (
          message.company?.name ||
          message.company_name ||
          "-"
        )
      },

      companyCnpj() {
        const message = this.rfqToManualPrice?.message || {}

        return (
          message.company?.cnpj ||
          message.company_cnpj ||
          "-"
        )
      },

      isReconciliation() {
        return this.mode === "reconciliation"
      },

      isPartner() {
        return Boolean(this.rfqToManualPrice?.message?.partner)
      },
    wrapperProps() {
      return this.isReconciliation
        ? { 'max-width': '600', transition: 'dialog-bottom-transition', persistent: true }
        : { 'hide-overlay': true, persistent: true }
    },
    /*
    formatQuote: {
      get() {
        return this.quote
      },
      set(v) {
        const raw = v.replace(/[^0-9]/g, "")
        if (raw === "") {
          this.quote = ""
          return
        }
        const digits = raw.slice(0, 5)

        if (digits.length === 1) {
          this.quote = `${digits}`
        } else {
          const whole = digits[0]
          const decimals = digits.slice(1)
          this.quote = `${whole}.${decimals}`
        }
      }
    },*/
    formatTitle() {
      const operationTypes = this.$t('broker.operationTypes')
      const partnerName = this.rfqToManualPrice.message?.partmaster_id !== 0 ? this.rfqToManualPrice.message?.broker_name : ''
      return {
        id: this.rfqToManualPrice.message ? this.rfqToManualPrice.message?.rfq_id : '',
        bankName: this.rfqToManualPrice.message?.bank_name ? this.rfqToManualPrice.message.bank_name : '',
        partnerName: partnerName,
        qty: this.rfqToManualPrice.message?.rfq_orderqty ? this.rfqToManualPrice.message.rfq_orderqty : '',
        side: this.rfqToManualPrice.message?.rfq_side ? this.rfqToManualPrice.message.rfq_side : '',
        settlement: this.rfqToManualPrice.message?.rfq_security === 'FXSPOT' ? this.rfqToManualPrice.message?.rfq_spotsett?.toUpperCase()
          : this.formatDate(this.rfqToManualPrice.message?.rfq_quote_settdate_ccy2),
        operationName: this.rfqToManualPrice.message?.operation_alias ?? "",
        operationType: operationTypes[this.rfqToManualPrice.message?.operation_type]  ?? "",
        ccy: this.rfqToManualPrice.message?.rfq_orderqty_ccy ? this.rfqToManualPrice.message.rfq_orderqty_ccy : '',
        rate: this.isReconciliation ? this.rfqToManualPrice.message?.rfq_px : null
      }
    },
    disableQuote() {
      const numAmount = Number(this.quote);
      return numAmount < 1 || numAmount > 10 || /\.\d{5,}$/.test(this.quote) || isNaN(numAmount) || (this.isReconciliation && !this.checkboxValue);
    },
    toggleMinimizeHeight() {
      return this.mini ? "50" : (!this.mini && this.fontSize === 1) ? "600" : (!this.mini && this.fontSize === 1.2) ? "750" : "810";
    },
    toggleMinimizeWidth() {
      return this.mini ? "200" : "600";
    }
  },
  methods: {
    handleClose() {
      this.internal = false
      if (this.isReconciliation) {
        this.checkboxValue = null
      } else {
        this.cancelQuote()
      }
    },
    handleSubmit() {
      if (this.isReconciliation) {
        this.sentReconciliation()
      } else {
        this.sentQuote()
      }
    },
    sentQuote() {
      this.$emit("sentQuote", {
        quote: Number(this.quote),
        bankId: this.rfqToManualPrice?.message?.bank_id,
        rfqId: this.rfqToManualPrice?.message?.rfq_id,
      })

      this.quote = 0
    },
    sentReconciliation() {
      const payload = normalizeReconciliationPayload(this.rfqToManualPrice.message, Number(this.quote))
      this.$emit("reconcileSubmit", {
        ...payload
      })

          this.quote = 0
          this.checkboxValue = null
          this.internal = false
    },
    cancelQuote() {
      // The cancelQuote option sends an empty price as a manual price.
      this.$emit("sentQuote", {
        quote: null,
        bankId: this.rfqToManualPrice?.message?.bank_id,
        rfqId: this.rfqToManualPrice?.message?.rfq_id
      })

      this.quote = 0
    },
    /*
    blockNonNumeric(e) {
      const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Escape'];
      if (allowed.includes(e.key)) return;
      if (!/^\d$/.test(e.key)) {
        e.preventDefault()
      }
    },*/
    formatDate(dateString) {
      if (dateString) {
        const year = dateString.substring(0, 4);
        const month = dateString.substring(4, 6);
        const day = dateString.substring(6, 8);
        return `${year}-${month}-${day}`;
      }
      return dateString;
    }
  },
};
</script>
<style>
.grid-info {
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
  align-items: center;
  justify-content: space-between;
  text-align: center;
}

.reconciliation-dialog {
  overflow: visible !important;
}
</style>
