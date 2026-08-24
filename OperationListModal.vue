<template>
  <v-dialog v-model="internalShow" persistent width="600">
    <v-card class="pa-5 rounded-lg">
      <v-card-text class="pb-0">
        <div class="d-flex flex-row align-center justify-space-between mb-2">
          <v-card-title class="pa-0">{{$t('instructions.uploadFiles.selectDocumentation')}}</v-card-title>
          <v-btn icon @click="onClose"
            ><v-icon>mdi-close</v-icon></v-btn
          >
        </div>
          <div class="d-flex flex-row align-center justify-space-between my-2 px-10">
            <v-card-subtitle class="titles alias-title">{{$t('toolbar.settings.userInfo.name')}}</v-card-subtitle>
            <v-card-subtitle class="titles alias-title pa-0">ID</v-card-subtitle>
        </div>
        <v-card elevation="0">
          <div
            v-for="(key, index) in allOperations"
            :key="`${key}-${index}`"
            style="border:thin solid #333; height:5vh"
            @click="selectOperation(key)"
            :style="
              checkbox === key.id
                ? 'border: 1px solid #0073ff; background : #0B2D54'
                : ''
            "
            class="d-flex list-doc my-2 flex-rows justify-space-between align-center px-2"
          >
            <div class="d-flex align-center mx-2">
              <v-radio-group v-model="checkbox">
                <v-radio class="compact-radio" :value="key.id" />
              </v-radio-group>
                <h3 class="alias-title px-3">{{ key.alias }}</h3>
            </div>
            <div class="d-flex align-center mx-2">
              <h5 class="short-id" :title="key.id">
                {{ key.id }}
              </h5>
            </div>
          </div>
        </v-card>
      </v-card-text>
      <v-pagination
        v-if="operationPagination.length > activeOperationPerPage"
        v-model="currentPerPage"
        :length="
          Math.max(1, Math.ceil(operationPagination.length / activeOperationPerPage))
        "
        class="mx-auto pagi-small"
        circle
        color="primary"
      />
      <v-row class="mx-5 my-1" justify="end">
        <v-btn
          class="rounded-sm"
          color="orange"
          elevation="0"
          tile
          :disabled="enableSelectedOperation"
          :loading="loadingOrder"
          @click="onConfirm"
        >
          {{$t('instructions.confirm')}}
        </v-btn>
      </v-row>
    </v-card>
  </v-dialog>
</template>
<script>
export default {
  props: {
    loadingOrder: Boolean,
    clientId :{type: String, default: null },
    value: {
      type: Boolean,
      default: false,
    },
    list: {
      required: true,
      default: () => []
    }
  },
  data() {
    return {
      operationList: [],
      checkbox: undefined,
      internalShow: this.value,
      currentPerPage: 1,
      activeOperationPerPage: 5,
    };
  },
  watch: {
    value(val) {
      this.internalShow = val;
    },
    internalShow(val) {
      this.$emit("input", val);
    },
    list: {
      handler (newVal) {
        this.operationList = newVal.filter(v=>v.amlCheck === 'true' || v.amlCheck === true)
        this.rfqId = this.operationList.rfqId || "";
      },
      deep: true
    }
  },
  computed: {
    enableSelectedOperation() {
      return this.checkbox === undefined || this.checkbox === null;
    },
    operationPagination(){
      return this.operationList.filter(op=>op.rfqId === null)
    },
    allOperations() {
      const per = this.activeOperationPerPage || 2;
      const total = this.operationList.length;
      const totalPages = Math.max(1, Math.ceil(total / per));
      const page = Math.min(Math.max(this.currentPerPage || 1, 1), totalPages);

      const start = (page - 1) * per;
      const end = start + per;

      let filteredOp = this.operationList.filter(op =>
        op.rfqId === null &&
        op.companyId === this.clientId
      )
      return [...filteredOp].slice(start, start + per);
    },
  },
  methods: {
    download(id) {
      this.$emit("download-operation", id);
    },
    selectOperation(op){
      console.log(op)
      this.checkbox = op.id
    },
    onConfirm() {
      const val = {
        openGridModal: true,
        operationId: this.checkbox,
      };
      this.$emit("open-grid-modal", val);
      this.internalShow = false;
      this.checkbox = undefined
    },
    onClose(){
      this.internalShow = false; 
      this.checkbox = undefined
    },
  },
};
</script>
<style scoped>
.compact-radio{
  transform: scale(.7);
}
.list-doc {
  display:grid;
  justify-content: center;
  gap: 1rem;
}
.pagi-small{
  transform: scale(.7) !important;
  transform-origin: center!important;
}

.alias-title{
  line-height:.5rem; 
  letter-spacing: .1rem;
  text-transform: uppercase; 
}
.titles{
  text-align: center;
}
.short-id {
  color: #949494;
  max-width: 150px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
