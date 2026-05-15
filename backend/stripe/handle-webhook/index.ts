// ============================================
// STRIPE WEBHOOK HANDLER
// ============================================
// supabase/functions/handle-webhook/index.ts
// This function handles Stripe webhooks to update membership status

const stripe = require("stripe")(Deno.env.get("STRIPE_SECRET_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req) => {
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    
    // Verify webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        Deno.env.get("STRIPE_WEBHOOK_SECRET")
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        const subscriptionId = session.subscription;
        
        if (userId && subscriptionId) {
          // Get subscription details
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          
          // Update membership
          await supabase
            .from("memberships")
            .upsert({
              user_id: userId,
              stripe_customer_id: session.customer,
              stripe_subscription_id: subscriptionId,
              status: subscription.status,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              membership_active: true,
              updated_at: new Date().toISOString(),
            }, { onConflict: "user_id" });
          
          // Update profile
          await supabase
            .from("profiles")
            .update({
              membership_active: true,
              stripe_customer_id: session.customer,
              updated_at: new Date().toISOString(),
            })
            .eq("id", userId);
          
          // Create notification
          await supabase
            .from("notifications")
            .insert({
              user_id: userId,
              title: "Welcome to Pro!",
              message: "Your Pro membership is now active. Enjoy full access to all websites!",
              type: "membership",
            });
        }
        break;
      }
      
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        
        // Find user by customer ID and update
        const { data: membership } = await supabase
          .from("memberships")
          .select("user_id, stripe_subscription_id")
          .eq("stripe_customer_id", customerId)
          .single();
        
        if (membership && membership.stripe_subscription_id) {
          const subscription = await stripe.subscriptions.retrieve(membership.stripe_subscription_id);
          
          await supabase
            .from("memberships")
            .update({
              status: subscription.status,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              membership_active: true,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", membership.user_id);
          
          await supabase
            .from("profiles")
            .update({
              membership_active: true,
              updated_at: new Date().toISOString(),
            })
            .eq("id", membership.user_id);
        }
        break;
      }
      
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        
        const { data: membership } = await supabase
          .from("memberships")
          .select("user_id")
          .eq("stripe_subscription_id", subscription.id)
          .single();
        
        if (membership) {
          const isActive = subscription.status === "active" || subscription.status === "trialing";
          
          await supabase
            .from("memberships")
            .update({
              status: subscription.status,
              current_period_end: subscription.current_period_end 
                ? new Date(subscription.current_period_end * 1000).toISOString()
                : null,
              membership_active: isActive,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", membership.user_id);
          
          await supabase
            .from("profiles")
            .update({
              membership_active: isActive,
              updated_at: new Date().toISOString(),
            })
            .eq("id", membership.user_id);
        }
        break;
      }
      
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        
        const { data: membership } = await supabase
          .from("memberships")
          .select("user_id")
          .eq("stripe_subscription_id", subscription.id)
          .single();
        
        if (membership) {
          await supabase
            .from("memberships")
            .update({
              status: "canceled",
              membership_active: false,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", membership.user_id);
          
          await supabase
            .from("profiles")
            .update({
              membership_active: false,
              updated_at: new Date().toISOString(),
            })
            .eq("id", membership.user_id);
          
          // Create notification
          await supabase
            .from("notifications")
            .insert({
              user_id: membership.user_id,
              title: "Membership Cancelled",
              message: "Your Pro membership has been cancelled. You can reactivate anytime.",
              type: "membership",
            });
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});