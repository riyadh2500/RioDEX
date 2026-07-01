import { NextResponse } from 'next/server'

const PINATA_API_KEY    = process.env.PINATA_API_KEY    ?? ''
const PINATA_API_SECRET = process.env.PINATA_API_SECRET ?? ''

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file     = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Forward to Pinata
    const pinataForm = new FormData()
    pinataForm.append('file', file, file.name)

    const pinataRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method:  'POST',
      headers: {
        pinata_api_key:        PINATA_API_KEY,
        pinata_secret_api_key: PINATA_API_SECRET,
      },
      body: pinataForm,
    })

    if (!pinataRes.ok) {
      const text = await pinataRes.text()
      console.error('[upload] Pinata error:', text)
      return NextResponse.json({ error: 'IPFS upload failed' }, { status: 502 })
    }

    const json = await pinataRes.json()
    const ipfsHash = json.IpfsHash as string
    const url      = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`

    return NextResponse.json({ ipfsHash, url })
  } catch (err) {
    console.error('[POST /api/upload]', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
