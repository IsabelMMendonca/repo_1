import { defineStore } from 'pinia';

export const useToggleFilter = defineStore('toggleFilter', {
    state:()=>({
        showFilters: false
    }),
    actions:{
        toggleFilter(){
            this.showFilters = !this.showFilters
        },
        set(val)
        {
            this.showFilters = val
        }
    }
})