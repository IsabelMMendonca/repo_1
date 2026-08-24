<template>
  <v-card>
    <v-card-actions
      class="d-flex flex-row justify-space-between align-cetner mx-3"
    >
      <div class="d-flex flex-column">
        <v-card-title class="font-weight-bold">{{ title }}</v-card-title>
        <v-card-subtitle>{{ subtitle }}</v-card-subtitle>
      </div>
      <div v-if="cta" class="d-flex flex-gap-2">
        <v-btn small @click="addBrokerOrBank(type)" color="primary px-1">
          <v-icon small class="mx-1">mdi-plus</v-icon>
          {{ cta }}
        </v-btn>
        <v-btn
          small
          v-if="cta2"
          outlined
          @click="exportBrokers"
          color="primary px-1"
        >
          <v-icon small class="mx-1">mdi-download</v-icon>
          <span class="white--text">{{ cta2 }}</span>
        </v-btn>
      </div>
    </v-card-actions>
    <v-data-table
      :loading="loading"
      item-key="id"
      :headers="headers"
      :item-class="rowClass"
      :items-per-page="-1"
      :items="items"
    >
      <template v-slot:item.is_partner="{ item }">
        <slot name="item.is_partner" :item="item" />
      </template>

      <template v-slot:item.banklist="{ item }">
        <slot name="item.banklist" :item="item" />
      </template>

      <template v-slot:item.partnerlist="{ item }">
        <slot name="item.partnerlist" :item="item" />
      </template>

      <template v-if="!isBroker" v-slot:item.brokerlist="{ item }">
        <slot name="item.brokerlist" :item="item" />
      </template>

      <template v-if="type === 'bank'" v-slot:item.mode="{ item }">
        <slot name="item.mode" :item="item" />
      </template>

      <template v-slot:item.delete="{ item }">
        <slot name="item.delete" :item="item"></slot>
      </template>

      <template #[`item.name`]="{ item }">
        <slot name="item.name" :item="item">
          <span :title="item.name" class="truncated-name">
            {{ item.name }}
          </span>
        </slot>
      </template>
      <template #[`item.broker_master`]="{ item }">
        <slot name="item.broker_master" :item="item">
          <span :title="item.broker_master" class="truncated-name">
            {{ item.broker_master }}
          </span>
        </slot>
      </template>
      <template v-if="type === 'company'" v-slot:item.status="{ item }">
        <slot name="item.status" :item="item"></slot>
      </template>
      <template v-if="type === 'user'" v-slot:item.id="{ item }">
        <slot name="item.id" :item="item"></slot>
      </template>
      <template v-if="type === 'user'" v-slot:item.broker="{ item }">
        <slot name="item.broker" :item="item"></slot>
      </template>
      <template v-if="type === 'user'" v-slot:item.company="{ item }">
        <slot name="item.company" :item="item"></slot>
      </template>
      <template v-if="type === 'user'" v-slot:item.bank="{ item }">
        <slot name="item.bank" :item="item"></slot>
      </template>
      <template v-if="type === 'user'" v-slot:item.role="{ item }">
        <slot name="item.role" :item="item"></slot>
      </template>
      <template v-slot:item.raw_tos_accepted_time="{ item }">
        <slot name="item.raw_tos_accepted_time" :item="item"></slot>
      </template>
      <template v-slot:item.entity_name="{ item }">
        <slot name="item.entity_name" :item="item"></slot>
      </template>
 
       <!--cnpj-->
       <template #[`item.cnpj`]="{ item }">
         <span
           class="cnpj-title"
           :style="{ '--cnpj-font-size': parseFloat(fontSizeFormat) + 'px' }"
         >
           {{ item.cnpj }}
         </span>
       </template>
 
       <!-- email -->
       <template #[`item.email`]="{ item }">
         <span
           class="cnpj-title"
           :style="{ '--cnpj-font-size': parseFloat(fontSizeFormat) + 'px' }"
         >
           {{ item.email || "-" }}
         </span>
       </template>
 
       <template #[`item.raw_timecreate`]="{ item }">
         <slot name="item.raw_timecreate" :item="item">
           <span style="white-space: nowrap">
             {{ item.timecreate || "-" }}
           </span>
         </slot>
       </template>
 
       <template #[`item.raw_lastTrade`]="{ item }">
         <slot name="item.raw_lastTrade" :item="item">
           <span style="white-space: nowrap">
             {{ item.lastTrade || "-" }}
           </span>
         </slot>
       </template>

       <template #[`item.last_activity`]="{ item }">
         <slot name="item.last_activity" :item="item">
           <span style="white-space: nowrap">
             {{ item.last_activity || "-" }}
           </span>
         </slot>
       </template>

       <template #[`item.raw_last_online`]="{ item }">
         <slot name="item.raw_last_online" :item="item">
           <span style="white-space: nowrap">
             {{ item.last_online || "-" }}
           </span>
         </slot>
       </template>
 
       <template #[`item.raw_first_login`]="{ item }">
         <slot name="item.raw_first_login" :item="item">
           <span style="white-space: nowrap">
             {{ item.first_login || "-" }}
           </span>
         </slot>
       </template>
    </v-data-table>
  </v-card>
</template>

<script>
import { mapStores } from "pinia";
import AdminList from "./AdminList.vue";
import { generateBrokerJSON } from "@/exportBrokersJson.js";
import { useSettingsStore } from "@/store";

export default {
  props: {
    title: {
      type: String,
    },
    subtitle: {
      type: String,
    },
    type: {
      type: String,
    },
    cta: {
      type: String,
    },
    cta2: {
      type: String,
      required: false,
    },
    loading: {
      type: Boolean,
    },
    headers: {
      type: Array,
    },
    items: {
      type: Array,
    },
    isBroker: {
      type: Boolean,
    },
    openSelectedId: {
      type: String,
    },
  },
  components: { AdminList },
  emits: [
    "toggle-override",
    "confirm-delete",
    "add",
    "update",
    "delete",
    "export",
  ],
  computed:{
    ...mapStores(useSettingsStore),
    fontSizeFormat() {
      return this.settingsStore.formatFontSize("full");
    },
  },
  methods: {
    toggleOverride(v) {
      this.$emit("toggle-override");
    },
    addBrokerOrBank(type) {
      this.$emit("add", type);
    },
    updateBroker(item, action, id) {
      this.$emit("update", { item, action, id });
    },
    confirmDelete(item, type, role=null) {
      this.$emit("delete", { item, type, role });
    },
    exportBrokers() {
      this.$emit("export");
    },
    rowClass(item) {
      return this.openSelectedId === item.id ? "highlight" : "";
    },
  },
};
</script>
<style scoped>
::v-deep .highlight {
  background: rgba(78, 78, 78, 0.4) !important;
}
.truncated-name {
  display: inline-block;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}
</style>
