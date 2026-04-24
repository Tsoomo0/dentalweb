<?php

namespace App\Services;

use App\Models\Appointment;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class QPayService
{
    private string $baseUrl;
    private string $username;
    private string $password;
    private string $invoiceCode;

    public function __construct()
    {
        $this->baseUrl     = config('services.qpay.base_url', 'https://sandbox-merchant.qpay.mn/v2');
        $this->username    = config('services.qpay.username', 'TEST_MERCHANT');
        $this->password    = config('services.qpay.password', '123456');
        $this->invoiceCode = config('services.qpay.invoice_code', 'TEST_INVOICE');
    }

    /**
     * QPay access token авах (5 минут cache-д хадгална)
     */
    public function getToken(): string
    {
        return Cache::remember('qpay_token', 270, function () {
            $response = Http::timeout(15)
                ->withBasicAuth($this->username, $this->password)
                ->post("{$this->baseUrl}/auth/token");

            if (!$response->successful()) {
                Log::error('QPay token error', ['status' => $response->status(), 'body' => $response->body()]);
                throw new \RuntimeException('QPay нэвтрэлт амжилтгүй: ' . $response->status() . ' — ' . $response->body());
            }

            $token = $response->json('access_token');

            if (empty($token)) {
                Log::error('QPay token empty', ['body' => $response->body()]);
                throw new \RuntimeException('QPay token хоосон ирлээ. Response: ' . $response->body());
            }

            return (string) $token;
        });
    }

    /**
     * QPay invoice үүсгэх
     * @return array{invoice_id: string, qr_text: string, qr_image: string, qpay_deeplink: array}
     */
    public function createInvoice(Appointment $appointment): array
    {
        $token = $this->getToken();

        $callbackUrl = route('payment.callback', ['appointment' => $appointment->id]);

        $response = Http::withToken($token)
            ->post("{$this->baseUrl}/invoice", [
                'invoice_code'          => $this->invoiceCode,
                'sender_invoice_no'     => $appointment->appointment_number,
                'invoice_receiver_code' => 'terminal',
                'invoice_description'   => "Онлайн зөвлөгөө #{$appointment->appointment_number}",
                'amount'                => $appointment->payment_amount,
                'callback_url'          => $callbackUrl,
            ]);

        if (!$response->successful()) {
            Log::error('QPay createInvoice error', [
                'appointment' => $appointment->id,
                'body'        => $response->body(),
            ]);
            throw new \RuntimeException('QPay invoice creation failed: ' . $response->body());
        }

        return $response->json();
    }

    /**
     * Төлбөр хийгдсэн эсэхийг шалгах
     */
    public function checkPayment(string $invoiceId): bool
    {
        try {
            $token = $this->getToken();

            $response = Http::withToken($token)
                ->post("{$this->baseUrl}/payment/check", [
                    'object_type'  => 'INVOICE',
                    'object_id'    => $invoiceId,
                    'offset'       => ['page_number' => 1, 'page_limit' => 100],
                ]);

            if (!$response->successful()) {
                Log::warning('QPay checkPayment error', ['invoice' => $invoiceId, 'body' => $response->body()]);
                return false;
            }

            $data = $response->json();
            return ($data['count'] ?? 0) > 0;
        } catch (\Throwable $e) {
            Log::error('QPay checkPayment exception', ['invoice' => $invoiceId, 'error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Invoice цуцлах
     */
    public function cancelInvoice(string $invoiceId): bool
    {
        try {
            $token    = $this->getToken();
            $response = Http::withToken($token)->delete("{$this->baseUrl}/invoice/{$invoiceId}");
            return $response->successful();
        } catch (\Throwable $e) {
            Log::error('QPay cancelInvoice exception', ['invoice' => $invoiceId, 'error' => $e->getMessage()]);
            return false;
        }
    }
}
