<template>
    <v-card :style="!isReconciliation && !mini ? 'border: 1px solid #0073ff' : ''"
        :color="!isReconciliation && mini ? 'primary' : ''" outlined
        :class="{ 'rfq-card--reconciliation': isReconciliation }"
        :width="toggleMinimizeWidth"
        :height="isReconciliation ? undefined : toggleMinimizeHeight">
        <div class="d-flex align-center"
            :class="!isReconciliation && mini ? 'justify-center mx-2' : 'justify-space-between mx-5'">
            <v-card-title :style="!isReconciliation && mini ? 'font-size: 10px' : ''"
                class="mt-0 py-3"
                style="text-transform: uppercase; letter-spacing: 0.1rem; line-height: 1rem;">
                <span v-if="isReconciliation" class="pt-3">{{ $t('instructions.reconcile') }}</span>
                <span v-else-if="!mini" class="pt-3">{{ $t('broker.status.quoteNeeded') }}</span>
                <div v-else>
                    <v-badge dot location="top-right" color="error">{{ $t('broker.status.miniQuoteNeeded') }}</v-badge>
                </div>
            </v-card-title>
            <div class="d-flex flex-row flex-gap-2">
                <v-btn v-if="!isReconciliation" :x-small="mini ? true : false" icon @click="$emit('toggle-mini')">
                    <v-icon :color="mini ? 'white' : 'primary'">{{ mini ? 'mdi-arrow-expand' : 'mdi-minus' }}</v-icon>
                </v-btn>
                <v-btn @click="$emit('close')"  @keydown.esc.prevent="$emit('close')" :x-small="!isReconciliation && mini ? true : false" icon>
                    <v-icon>mdi-close</v-icon>
                </v-btn>
            </div>
        </div>

        <v-card-text :class="isReconciliation ? 'mt-0 pt-0' : 'my-2'">
            <v-card class="px-5 pt-4 pb-2" outlined elevation="0">
                <div class="d-flex justify-space-between mx-3">
                    <h2 class="my-1">ID:{{ formatTitle.id }}</h2>
                    <v-chip style="color:white !important; background:#1f52915e !important" outlined color="primary"
                        v-if="formatTitle.partnerName">
                        {{ formatTitle.partnerName }}
                    </v-chip>
                </div>
                <v-divider></v-divider>
                <v-card-text class="grid-info" :class="{ 'grid-info--reconciliation': isReconciliation }">
                    <div v-for="item in infoRows" :key="item.key" class="row-info">
                        <h4>{{ item.label }}</h4>
                        <h2>{{ item.value }}</h2>
                    </div>
                </v-card-text>
                <v-card-text>
                    <price-input :quote="_quote" @update:quote="_quote = $event" @submit="submitQuote" />
                </v-card-text>
            </v-card>
            <div v-if="isReconciliation" class="d-flex flex-column align-start flex-gap-2 mt-1">
                <v-alert outlined dense style="width:100%" class="mt-1 text-caption flex-grow-1">
                    <div class="d-flex flex-column  justify-between">
                        <div>{{ isPartner ? 'Partner' : 'Broker' }}: <strong>{{ brokerName }}</strong></div>
                        <div>Client:<strong> {{ companyName }}</strong> <span>({{ formatCnpj(companyCnpj) }})</span>

                        </div>
                    </div>

                    <div class="mt-1 text-caption">
                       {{ $t("instructions.acknowledgementReconcile")}}
                    </div>
                </v-alert>

                <div class="d-flex align-center ">
                    <v-checkbox class="mt-0" dense :input-value="checked" @change="sendCheck" />
                    <v-label class="mt-0">{{ $t('instructions.confirmAcknowledgement') }}</v-label>
                </div>
            </div>
            <div class="mx-auto mt-2">
                <v-btn block :disabled="disableQuote" @click="submitQuote" class="pa-8" large color="primary">
                    {{ isReconciliation ? $t('broker.buttons.reconcile') : $t('broker.buttons.quote') }}
                </v-btn>
            </div>
        </v-card-text>
    </v-card>
</template>
<script>

import PriceInput from './PriceInput.vue';
import convertToCNPJ from '@/utils.js';
export default {
    components: { PriceInput },
    props: {
        isReconciliation: {
            type: Boolean,
            default: false
        },

        checked: {
            type: [Boolean, String],
            default: false
        },

        mini: {
            type: Boolean,
            default: false
        },

        formatTitle: {
            type: Object,
            required: true
        },

        rfqData: {
            type: Object,
            default: () => ({})
        },

        quote: {
            type: [String, Number],
            default: ''
        },

        disableQuote: {
            type: Boolean,
            default: false
        },

        fontSize: {
            type: Number,
            default: 1
        },
        toggleMinimizeWidth: {
            type: String,
            required: false
        },
        toggleMinimizeHeight: {
            type: String,
            required: false
        },
        brokerName: {
            type: String,
            required: false,
        },
        isPartner: {
            type: Boolean,
            default: false
        },
        companyName: {
            type: String,
            required: false,
            default: ''
        },
        companyCnpj: {
            type: String,
            required: false,
            default: ''
        }
    },
    computed: {
        _quote: {
            get() {
                return this.quote
            },
            set(v) {
                this.$emit("update:quote", v)

            }
        },
        settlementLabel() {
            const security = this.rfqData.message?.rfq_security

            if (!security) return ""

            return security === "FXSPOT"
                ? this.$t("quoteInfo.settlement")
                : this.$t("quoteInfo.maturityText")
        },

        infoRows() {
            return [
                {
                    key: "bankName",
                    label: this.$t("quoteInfo.bankName"),
                    value: this.formatTitle.bankName
                },
                {
                    key: "opName",
                    label: this.$t("quoteInfo.opName"),
                    value: this.formatTitle.operationName
                },

                {
                    key: "opType",
                    label: this.$t("broker.labels.transactionPurpose"),
                    value: this.formatTitle.operationType
                },
                {
                    key: "amount",
                    label: this.$t("quoteInfo.amount"),
                    value: this.formatTitle.qty
                },
                {
                    key: "side",
                    label: this.$t("quoteInfo.side"),
                    value: this.formatTitle.side
                },
                {
                    key: "settlement",
                    label: this.settlementLabel,
                    value: this.formatTitle.settlement,
                    show: Boolean(this.rfqData.message?.rfq_security)
                },
                {
                    key: "rate",
                    label: "Rate",
                    value: this.formatTitle.rate,
                    show: Boolean(this.formatTitle.rate)
                },
                {
                    key: "ccy",
                    label: this.$t("quoteInfo.ccy"),
                    value: this.formatTitle.ccy
                }
            ].filter((item) => item.show !== false)
        }
    },
    methods: {
        submitQuote() {
            if (!this.disableQuote) this.$emit('submit')
        },
        sendCheck(v) {
            this.$emit('update:checked', v)
            this.$emit('checking', v)
        },
        formatCnpj(cnpj)
        {
            return convertToCNPJ(cnpj)
        }
    }
}
</script>

<style scoped>
::v-deep .v-input input {
    max-height: 100px !important;
    text-align: center !important;
}

::v-deep .v-messages {
    display: none;
}

.row-info{
    display:flex;
    align-items: center;
    justify-content: space-between;
    width:100%;
    flex-grow: 1;
}

.grid-info--reconciliation {
    gap: .75rem;
    padding-top: 12px;
    padding-bottom: 12px;
}

.rfq-card--reconciliation {
    height: auto !important;
}

.rfq-card--reconciliation .row-info h2,
.rfq-card--reconciliation .row-info h4 {
    margin-top: 0;
    margin-bottom: 0;
}

</style>
