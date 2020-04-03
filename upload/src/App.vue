<template>
    <div calss="app">
        <router-view></router-view>
    </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'

@Component
export default class extends Vue {}
</script>

<style scoped lang="stylus"></style>
