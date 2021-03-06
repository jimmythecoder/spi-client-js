import {Events, Message} from './Messages';
import {PurchaseResponse} from './Purchase';

// <summary>
// This class represents the BillDetails that the POS will be asked for throughout a PayAtTable flow.
// </summary>
export class BillStatusResponse
{
    constructor() {
        // <summary>
        // Set this Error accordingly if you are not able to return the BillDetails that were asked from you.
        // </summary>
        this.Result = null;
        
        // <summary>
        // This is a unique identifier that you assign to each bill.
        // It migt be for example, the timestamp of when the cover was opened.
        // </summary>
        this.BillId = null;
        
        // <summary>
        // This is the table id that this bill was for.
        // The waiter will enter it on the Eftpos at the start of the PayAtTable flow and the Eftpos will 
        // retrieve the bill using the table id. 
        // </summary>
        this.TableId = null;
        
        // <summary>
        // The Total Amount on this bill, in cents.
        // </summary>
        this.TotalAmount = 0;
        
        // <summary>
        // The currently outsanding amount on this bill, in cents.
        // </summary>
        this.OutstandingAmount = 0;

        // <summary>
        // Your POS is required to persist some state on behalf of the Eftpos so the Eftpos can recover state.
        // It is just a piece of string that you save against your billId.
        // WHenever you're asked for BillDetails, make sure you return this piece of data if you have it.
        // </summary>
        this.BillData = "";
    }

    getBillPaymentHistory()
    {
        if (!this.BillData)
        {
            return [];
        }
        
        let billPaymentHistory = [];
        let savedBillData = JSON.parse(this.BillData);

        return savedBillData.map((bill) => {
            return new PaymentHistoryEntry(bill.payment_type, bill.payment_summary);
        });
    }

    static ToBillData(ph)
    {
        if (ph.length < 1)
        {
            return "";
        }

        return JSON.stringify(ph);
    }
    
    ToMessage(messageId)
    {
        var data = {
            "success": this.Result==BillRetrievalResult.SUCCESS
        };
        
        if (this.BillId) data.bill_id = this.BillId;
        if (this.TableId) data.table_id = this.TableId;

        if (this.Result == BillRetrievalResult.SUCCESS)
        {
            data.bill_total_amount = this.TotalAmount;
            data.bill_outstanding_amount = this.OutstandingAmount;
            data.bill_payment_history = this.getBillPaymentHistory();
        }
        else
        {
            data.error_reason = this.Result.toString();
            data.error_detail = this.Result.toString();
        }

        return new Message(messageId, Events.PayAtTableBillDetails, data, true);
    }
}

export const BillRetrievalResult = 
{
    SUCCESS: 'SUCCESS',
    INVALID_TABLE_ID: 'INVALID_TABLE_ID',
    INVALID_BILL_ID: 'INVALID_BILL_ID',
    INVALID_OPERATOR_ID: 'INVALID_OPERATOR_ID'
};

export const PaymentType = 
{
    CARD: 'CARD',
    CASH: 'CASH' 
};

export class BillPayment
{
    constructor(m)
    {
        this._incomingAdvice = m;
        this.BillId = this._incomingAdvice.Data["bill_id"];
        this.TableId = this._incomingAdvice.Data["table_id"];
        this.OperatorId = this._incomingAdvice.Data["operator_id"];
        
        var pt = this._incomingAdvice.Data["payment_type"];
        this.PaymentType = pt;
        
        // this is when we ply the sub object "payment_details" into a purchase response for convenience.
        var purchaseMsg = new Message(m.Id, "payment_details", m.Data["payment_details"], false);
        this.PurchaseResponse = new PurchaseResponse(purchaseMsg);

        this.PurchaseAmount = this.PurchaseResponse.GetPurchaseAmount();
        this.TipAmount = this.PurchaseResponse.GetTipAmount();
    }
}

export class PaymentHistoryEntry
{
    constructor(paymentType, paymentSummary)
    {
        this.PaymentType = paymentType;
        this.PaymentSummary = paymentSummary;
    }

    toJSON() {
        return {
            payment_type: this.PaymentType,
            payment_summary: this.PaymentSummary
        };
    }
    
    GetTerminalRefId()
    {
        return this.PaymentSummary["terminal_ref_id"];
    }
}

export class PayAtTableConfig
{
    constructor() {
        this.PayAtTabledEnabled = false;
        this.OperatorIdEnabled = false;
        this.SplitByAmountEnabled = false;
        this.EqualSplitEnabled = false;
        this.TableRetrievalEnabled = false;
     
        this.TippingEnabled = false;
    
        this.SummaryReportEnabled = false;
    
        this.LabelPayButton = '';
        this.LabelOperatorId = '';
        this.LabelTableId = '';
    
        // 
        // <summary>
        // Fill in with operator ids that the eftpos terminal will validate against. 
        // Leave Empty to allow any operator_id through. 
        // </summary>
       this.AllowedOperatorIds = [];
    }

    ToMessage(messageId)
    {
        var data = {
            "pay_at_table_enabled": this.PayAtTabledEnabled,
            "operator_id_enabled": this.OperatorIdEnabled,
            "split_by_amount_enabled": this.SplitByAmountEnabled,
            "equal_split_enabled": this.EqualSplitEnabled,
            "tipping_enabled": this.TippingEnabled,
            "summary_report_enabled": this.SummaryReportEnabled,
            "pay_button_label": this.LabelPayButton,
            "operator_id_label": this.LabelOperatorId,
            "table_id_label": this.LabelTableId,
            "operator_id_list": this.AllowedOperatorIds,
            "table_retrieval_enabled": this.TableRetrievalEnabled,
        };

        return new Message(messageId, Events.PayAtTableSetTableConfig, data, true);
    }
    
    static FeatureDisableMessage(messageId) {
        var data = {
            "pay_at_table_enabled": false
        };
        return new Message(messageId, Events.PayAtTableSetTableConfig, data, true);
    }
}

    
