<?php

namespace App\Services;

use Google\Client;
use Google\Service\Meet;
use Google\Service\Meet\Space;

class GoogleMeetService
{
    private Client $client;

    public function __construct()
    {
        $this->client = new Client();
        $this->client->setClientId(config('services.google.client_id'));
        $this->client->setClientSecret(config('services.google.client_secret'));
        $this->client->setAccessType('offline');

        $this->client->fetchAccessTokenWithRefreshToken(config('services.google.refresh_token'));
    }

    public function createMeetLink(): ?string
    {
        try {
            $service = new Meet($this->client);
            $space   = new Space();
            $created = $service->spaces->create($space);
            return $created->getMeetingUri();
        } catch (\Exception $e) {
            \Log::error('Google Meet link үүсгэхэд алдаа: ' . $e->getMessage());
            return null;
        }
    }
}
