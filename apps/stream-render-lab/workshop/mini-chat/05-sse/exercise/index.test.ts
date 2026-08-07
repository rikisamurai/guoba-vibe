import { defineStep05Contract } from '../contract'
import * as core from './index'
import * as sse from './sse'

defineStep05Contract({ ...core, ...sse })
