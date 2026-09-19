import React from 'react';
import { Form, Row, Col, Tabs, Card, Typography, Space } from 'antd';
import { User, FileText, Users, ShieldCheck, MapPin } from 'lucide-react';
import FamilyTreeEditor from './FamilyTreeEditor';
import PhotoUploadBox from './PhotoUploadBox';
import GhanshyamInput from './GhanshyamInput';

const { Text } = Typography;

export default function PedhinamuForm({
  data,
  onChange,
  onAutoArrangeTree,
  selectedNodeId,
  onSelectNode
}) {
  const handleGeneralChange = (field, value) => {
    onChange({
      ...data,
      general: {
        ...data.general,
        [field]: value
      }
    });
  };

  const handleApplicantChange = (field, value) => {
    onChange({
      ...data,
      applicant: {
        ...data.applicant,
        [field]: value
      }
    });
  };

  const handleDeceasedChange = (field, value) => {
    const updatedDeceased = {
      ...data.deceased,
      [field]: value
    };

    let updatedTree = data.tree;
    if (data.tree?.rootNode) {
      updatedTree = {
        ...data.tree,
        rootNode: {
          ...data.tree.rootNode,
          name: field === 'name' ? value : data.tree.rootNode.name,
          deathDate: field === 'deathDate' ? value : data.tree.rootNode.deathDate
        }
      };
    }

    onChange({
      ...data,
      deceased: updatedDeceased,
      tree: updatedTree
    });
  };

  const handleTreeChange = (newTree) => {
    onChange({
      ...data,
      tree: newTree
    });
  };

  const handlePanchChange = (index, field, value) => {
    const newPanchas = [...data.panchas];
    newPanchas[index] = {
      ...newPanchas[index],
      [field]: value
    };
    onChange({
      ...data,
      panchas: newPanchas
    });
  };

  const tabItems = [
    {
      key: 'general',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
          <MapPin size={15} /> સામાન્ય
        </span>
      ),
      children: (
        <Form layout="vertical" requiredMark={false} style={{ padding: '4px 0' }}>
          {/* Card 1: Village & Office */}
          <Card
            size="small"
            className="form-section-card"
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                <MapPin size={15} color="#4f46e5" /> ગામ અને કચેરી (Village & Office)
              </span>
            }
          >
            <Row gutter={[14, 12]}>
              <Col span={12}>
                <Form.Item label="મોજે" style={{ marginBottom: 0 }}>
                  <GhanshyamInput
                    value={data.general.moje}
                    placeholder="દા.ત. ડભોલી (Dabholi)"
                    onChange={(e) => handleGeneralChange('moje', e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="તલાટી કચેરી મોજે" style={{ marginBottom: 0 }}>
                  <GhanshyamInput
                    value={data.general.talatiMoje}
                    placeholder="દા.ત. ડભોલી (Dabholi)"
                    onChange={(e) => handleGeneralChange('talatiMoje', e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="તાલુકો" style={{ marginBottom: 0 }}>
                  <GhanshyamInput
                    value={data.general.taluka}
                    placeholder="દા.ત. કતારગામ"
                    onChange={(e) => handleGeneralChange('taluka', e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="જીલ્લો" style={{ marginBottom: 0 }}>
                  <GhanshyamInput
                    value={data.general.district}
                    placeholder="દા.ત. સુરત"
                    onChange={(e) => handleGeneralChange('district', e.target.value)}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Card 2: Registration Details */}
          <Card
            size="small"
            className="form-section-card"
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                <FileText size={15} color="#059669" /> રજીસ્ટ્રેશન વિગત (Registration)
              </span>
            }
          >
            <Row gutter={[14, 12]}>
              <Col span={14}>
                <Form.Item label="રજી. નં. (Registration No.)" style={{ marginBottom: 0 }}>
                  <GhanshyamInput
                    value={data.general.registrationNo}
                    placeholder="દા.ત. ............"
                    onChange={(e) => handleGeneralChange('registrationNo', e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col span={10}>
                <Form.Item label="નોંધણી વર્ષ (Year)" style={{ marginBottom: 0 }}>
                  <GhanshyamInput
                    value={data.general.registrationYear}
                    placeholder="દા.ત. ૨૦૨૬"
                    onChange={(e) => handleGeneralChange('registrationYear', e.target.value)}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Card 3: Place & Dates */}
          <Card
            size="small"
            className="form-section-card"
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                <MapPin size={15} color="#d97706" /> સ્થળ અને તારીખો (Place & Dates)
              </span>
            }
          >
            <Row gutter={[14, 12]}>
              <Col span={8}>
                <Form.Item label="સ્થળ (Place)" style={{ marginBottom: 0 }}>
                  <GhanshyamInput
                    value={data.general.place}
                    placeholder="દા.ત. સુરત (Surat)"
                    onChange={(e) => handleGeneralChange('place', e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="તારીખ (Date)" style={{ marginBottom: 0 }}>
                  <GhanshyamInput
                    value={data.general.currentDate}
                    placeholder="દા.ત. ૨૦-૦૮-૨૦૨૬"
                    onChange={(e) => handleGeneralChange('currentDate', e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="અરજી તારીખ (App Date)" style={{ marginBottom: 0 }}>
                  <GhanshyamInput
                    value={data.general.applicationDate}
                    placeholder="દા.ત. ૨૦-૦૮-૨૦૨૬"
                    onChange={(e) => handleGeneralChange('applicationDate', e.target.value)}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </Form>
      )
    },
    {
      key: 'applicant',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
          <User size={15} /> અરજદાર
        </span>
      ),
      children: (
        <Form layout="vertical" requiredMark={false} style={{ padding: '4px 0' }}>
          <Card
            size="small"
            className="form-section-card"
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                <User size={15} color="#4f46e5" /> અરજદારની વિગત (Applicant Profile)
              </span>
            }
          >
            <Row gutter={[16, 12]}>
              <Col span={17}>
                <Form.Item label="અરજદારનું પૂરું નામ" style={{ marginBottom: 12 }}>
                  <GhanshyamInput
                    value={data.applicant.name}
                    placeholder="દા.ત. દિનેશભાઇ મધુભાઇ જીકાદરા"
                    onChange={(e) => handleApplicantChange('name', e.target.value)}
                  />
                </Form.Item>

                <Row gutter={[10, 10]}>
                  <Col span={8}>
                    <Form.Item label="ઉંમર" style={{ marginBottom: 0 }}>
                      <GhanshyamInput
                        value={data.applicant.age}
                        placeholder="દા.ત. ૪૮"
                        onChange={(e) => handleApplicantChange('age', e.target.value)}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="ધંધો" style={{ marginBottom: 0 }}>
                      <GhanshyamInput
                        value={data.applicant.occupation}
                        placeholder="દા.ત. વેપાર"
                        onChange={(e) => handleApplicantChange('occupation', e.target.value)}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="સંબંધ" style={{ marginBottom: 0 }}>
                      <GhanshyamInput
                        value={data.applicant.relationWithDeceased}
                        placeholder="દા.ત. મારા પિતા"
                        onChange={(e) => handleApplicantChange('relationWithDeceased', e.target.value)}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Col>

              <Col span={7} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ marginBottom: 6, fontSize: 12, fontWeight: 600, color: '#475569' }}>અરજદાર ફોટો</div>
                <PhotoUploadBox
                  photoUrl={data.applicant.photoUrl}
                  onPhotoChange={(url) => handleApplicantChange('photoUrl', url)}
                  label="અરજદાર ફોટો"
                  width={95}
                  height={120}
                />
              </Col>

              <Col span={24}>
                <Form.Item label="રહેઠાણનું પૂરું સરનામું" style={{ marginBottom: 0, marginTop: 4 }}>
                  <GhanshyamInput
                    isTextArea={true}
                    rows={3}
                    value={data.applicant.address}
                    placeholder="દા.ત. ૧૪૯, બાપાસીતારામ નગર સોસા., ડભોલી રોડ, કતારગામ, સુરત-૩૯૫૦૦૪."
                    onChange={(e) => handleApplicantChange('address', e.target.value)}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </Form>
      )
    },
    {
      key: 'deceased',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
          <FileText size={15} /> સ્વર્ગસ્થ
        </span>
      ),
      children: (
        <Form layout="vertical" requiredMark={false} style={{ padding: '4px 0' }}>
          <Card
            size="small"
            className="form-section-card"
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                <FileText size={15} color="#e11d48" /> સ્વર્ગસ્થ પૂર્વજની વિગત
              </span>
            }
          >
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: '#166534' }}>
              💡 આ વ્યક્તિ કુટુંબ વૃક્ષમાં મુખ્ય પૂર્વજ (Root Node) તરીકે રહેશે.
            </div>

            <Row gutter={[14, 14]}>
              <Col span={24}>
                <Form.Item label="સ્વર્ગસ્થનું પૂરું નામ" style={{ marginBottom: 0 }}>
                  <GhanshyamInput
                    value={data.deceased.name}
                    placeholder="દા.ત. મધુભાઇ પરશોતમભાઇ જીકાદરા"
                    onChange={(e) => handleDeceasedChange('name', e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="અવસાન તારીખ" style={{ marginBottom: 0 }}>
                  <GhanshyamInput
                    value={data.deceased.deathDate}
                    placeholder="દા.ત. ૨૦-૦૧-૨૦૨૬"
                    onChange={(e) => handleDeceasedChange('deathDate', e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="અવસાન સ્થળ" style={{ marginBottom: 0 }}>
                  <GhanshyamInput
                    value={data.deceased.deathPlace}
                    placeholder="દા.ત. સુરત"
                    onChange={(e) => handleDeceasedChange('deathPlace', e.target.value)}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </Form>
      )
    },
    {
      key: 'tree',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
          <Users size={15} /> કુટુંબ વૃક્ષ
        </span>
      ),
      children: (
        <FamilyTreeEditor
          tree={data.tree}
          deceased={data.deceased}
          onChange={handleTreeChange}
          onAutoArrange={onAutoArrangeTree}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
        />
      )
    },
    {
      key: 'panchas',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
          <ShieldCheck size={15} /> પંચો
        </span>
      ),
      children: (
        <Form layout="vertical" requiredMark={false} style={{ padding: '4px 0' }}>
          <Space direction="vertical" style={{ width: '100%' }} size={14}>
            {data.panchas.map((panch, pIdx) => (
              <Card
                key={panch.id || pIdx}
                size="small"
                className="form-section-card"
                title={
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                    <ShieldCheck size={15} color="#4f46e5" /> પંચ - {pIdx + 1}
                  </span>
                }
              >
                <Row gutter={[14, 10]}>
                  <Col span={17}>
                    <Form.Item label={`પંચ-${pIdx + 1} નું નામ (Full Name)`} style={{ marginBottom: 10 }}>
                      <GhanshyamInput
                        value={panch.name}
                        placeholder={`પંચ-${pIdx + 1} નું પૂરું નામ`}
                        onChange={(e) => handlePanchChange(pIdx, 'name', e.target.value)}
                      />
                    </Form.Item>
                    <Row gutter={[8, 8]}>
                      <Col span={8}>
                        <Form.Item label="ઉંમર (Age)" style={{ marginBottom: 0 }}>
                          <GhanshyamInput
                            value={panch.age}
                            placeholder="ઉંમર"
                            onChange={(e) => handlePanchChange(pIdx, 'age', e.target.value)}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item label="ધંધો (Job)" style={{ marginBottom: 0 }}>
                          <GhanshyamInput
                            value={panch.occupation}
                            placeholder="વેપાર"
                            onChange={(e) => handlePanchChange(pIdx, 'occupation', e.target.value)}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item label="મોબાઈલ નં." style={{ marginBottom: 0 }}>
                          <GhanshyamInput
                            value={panch.mobileNumber}
                            placeholder="મોબાઈલ"
                            onChange={(e) => handlePanchChange(pIdx, 'mobileNumber', e.target.value)}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Col>
                  <Col span={7} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ marginBottom: 4, fontSize: 11, fontWeight: 600, color: '#475569' }}>પંચ-{pIdx + 1} ફોટો</div>
                    <PhotoUploadBox
                      photoUrl={panch.photoUrl}
                      onPhotoChange={(url) => handlePanchChange(pIdx, 'photoUrl', url)}
                      label={`પંચ-${pIdx + 1}`}
                      width={80}
                      height={100}
                    />
                  </Col>
                  <Col span={24}>
                    <Form.Item label="રહેઠાણનું પૂરું સરનામું (Full Address)" style={{ marginBottom: 0, marginTop: 4 }}>
                      <GhanshyamInput
                        value={panch.address}
                        placeholder="રહેઠાણનું પૂરું સરનામું"
                        onChange={(e) => handlePanchChange(pIdx, 'address', e.target.value)}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            ))}
          </Space>
        </Form>
      )
    }
  ];

  // Calculate family tree stats
  const countStats = (node) => {
    if (!node) return { total: 0, alive: 0, deceased: 0 };
    let total = 1;
    let alive = node.deceased ? 0 : 1;
    let deceased = node.deceased ? 1 : 0;
    if (node.children && node.children.length > 0) {
      node.children.forEach((child) => {
        const sub = countStats(child);
        total += sub.total;
        alive += sub.alive;
        deceased += sub.deceased;
      });
    }
    return { total, alive, deceased };
  };

  const stats = countStats(data.tree?.rootNode);

  return (
    <div className="pedhinamu-form-container">
      {/* Quick Summary Stats Strip */}
      <div className="pedhinamu-stats-strip">
        <div className="stat-card">
          <span className="stat-label">કુલ સભ્યો (Members)</span>
          <span className="stat-value primary">{stats.total}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">હયાત (Alive)</span>
          <span className="stat-value success">{stats.alive}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">સ્વર્ગસ્થ (Deceased)</span>
          <span className="stat-value neutral">{stats.deceased}</span>
        </div>
      </div>

      <Tabs
        defaultActiveKey="tree"
        items={tabItems}
        className="pedhinamu-segmented-tabs"
      />
    </div>
  );
}
