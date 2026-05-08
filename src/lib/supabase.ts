import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mzrtilffsprxrymazckn.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cnRpbGZmc3ByeHJ5bWF6Y2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NjM4MjgsImV4cCI6MjA5MzUzOTgyOH0.uswicYejRL7Xo0R9ZOVhpYcJUUuYRTijYaMk4XZNFLA'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)