import { NextResponse } from 'next/server'
import { providers } from '@/types'

export async function GET() {
  return NextResponse.json(providers)
}