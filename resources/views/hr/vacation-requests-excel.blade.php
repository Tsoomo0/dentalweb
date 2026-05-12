<table>
  <thead>
    <tr>
      <th>№</th>
      <th>Ажилтан</th>
      <th>Ажилтны дугаар</th>
      <th>Албан тушаал</th>
      <th>Салбар</th>
      <th>Эхлэх огноо</th>
      <th>Дуусах огноо</th>
      <th>Нийт хоног</th>
      <th>Орлох ажилтан</th>
      <th>Байршил</th>
      <th>Яаралтай утас</th>
      <th>Энэ жил авсан</th>
      <th>Шалтгаан</th>
      <th>Статус</th>
      <th>Шийдвэрлэсэн</th>
      <th>Илгээсэн огноо</th>
    </tr>
  </thead>
  <tbody>
    @foreach($requests as $i => $r)
    <tr>
      <td>{{ $i + 1 }}</td>
      <td>{{ $r->employee->full_name }}</td>
      <td>{{ $r->employee->employee_number }}</td>
      <td>{{ $r->employee->position?->name ?? '' }}</td>
      <td>{{ $r->employee->branch?->name ?? '' }}</td>
      <td>{{ $r->start_date->format('Y-m-d') }}</td>
      <td>{{ $r->end_date->format('Y-m-d') }}</td>
      <td>{{ $r->days }}</td>
      <td>{{ $r->replacement?->full_name ?? '' }}</td>
      <td>{{ $r->location_during_leave }}</td>
      <td>{{ $r->emergency_phone }}</td>
      <td>{{ $r->had_annual_leave_this_year ? 'Тийм' : 'Үгүй' }}</td>
      <td>{{ $r->reason }}</td>
      <td>
        @if($r->isApproved()) Зөвшөөрсөн
        @elseif($r->isRejected()) Цуцалсан
        @else Хүлээгдэж байна @endif
      </td>
      <td>{{ $r->reviewer?->name ?? '' }}</td>
      <td>{{ $r->created_at->format('Y-m-d') }}</td>
    </tr>
    @endforeach
  </tbody>
</table>
