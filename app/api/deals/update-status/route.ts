// app/api/deals/update-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';
import { awardDealWonXP, awardDealAdvancedXP } from '@/lib/xp/award';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DEALS_DB = process.env.NOTION_DATABASE_DEALS || process.env.DEALS_DB;

// Define which statuses count as "won" and which count as "advanced"
const WON_STATUSES = ['Won', 'Closed Won', 'Funded', 'Completed'];
const ADVANCED_STATUSES = ['Proposal', 'Negotiation', 'Contract', 'Processing', 'Underwriting', 'Approved'];

export async function POST(request: NextRequest) {
  try {
    const { dealId, newStatus, previousStatus } = await request.json();

    if (!dealId || !newStatus) {
      return NextResponse.json({ 
        error: 'Deal ID and new status required' 
      }, { status: 400 });
    }

    if (!DEALS_DB) {
      return NextResponse.json({ 
        error: 'Deals database not configured' 
      }, { status: 500 });
    }

    // Get deal details
    const dealPage = await notion.pages.retrieve({ page_id: dealId }) as any;
    const dealName = dealPage.properties['Name']?.title?.[0]?.plain_text || 
                     dealPage.properties['Deal Name']?.title?.[0]?.plain_text || 
                     'Deal';
    const currentStatus = dealPage.properties['Status']?.select?.name || 
                          dealPage.properties['Stage']?.select?.name;

    // Update the deal status in Notion
    await notion.pages.update({
      page_id: dealId,
      properties: {
        'Status': { select: { name: newStatus } },
        'Last Updated': { date: { start: new Date().toISOString() } },
      }
    });

    // 🎮 Award XP based on status change
    let xpResult = null;
    let xpType = null;

    // Check if this is a win
    if (WON_STATUSES.some(s => s.toLowerCase() === newStatus.toLowerCase())) {
      xpResult = await awardDealWonXP(dealId, dealName);
      xpType = 'won';
    }
    // Check if this is an advancement (moving to a later stage)
    else if (ADVANCED_STATUSES.some(s => s.toLowerCase() === newStatus.toLowerCase())) {
      // Only award if actually advancing (not going backwards)
      const prevIndex = ADVANCED_STATUSES.findIndex(s => s.toLowerCase() === currentStatus?.toLowerCase());
      const newIndex = ADVANCED_STATUSES.findIndex(s => s.toLowerCase() === newStatus.toLowerCase());
      
      if (newIndex > prevIndex || prevIndex === -1) {
        xpResult = await awardDealAdvancedXP(dealId, dealName);
        xpType = 'advanced';
      }
    }

    return NextResponse.json({
      success: true,
      dealId,
      dealName,
      previousStatus: currentStatus,
      newStatus,
      message: xpType === 'won' 
        ? `🏆 Deal won: ${dealName}!` 
        : `Deal updated to ${newStatus}`,
      xp: xpResult ? {
        awarded: true,
        type: xpType,
        amount: xpResult.amount,
        category: xpResult.category,
      } : {
        awarded: false
      },
    });

  } catch (error: any) {
    console.error('Deal status update error:', error);
    return NextResponse.json(
      { error: 'Failed to update deal', details: error.message },
      { status: 500 }
    );
  }
}